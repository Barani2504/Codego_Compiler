import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import Redis from 'ioredis';

import { ExecutionService } from './execution.service';
import { GradingService } from '../grading/grading.service';
import { UsersService } from '../users/users.service';
import { Submission, SubmissionStatus } from '../submissions/submission.entity';
import { REDIS_CLIENT } from '../common/redis/redis.module';

/**
 * ExecutionProcessor — Bull worker that runs inside each worker container.
 *
 * concurrency: 5 means each worker process handles 5 Judge0 submissions
 * simultaneously. With 4 worker containers → 20 concurrent executions before
 * any job has to wait in the queue.
 *
 * Job payload shape:
 *   { submissionId, code, language, question: { difficulty, problemStatement, testCases } }
 */
@Processor('execution')
export class ExecutionProcessor {
  private readonly logger = new Logger(ExecutionProcessor.name);

  constructor(
    private readonly executionService: ExecutionService,
    private readonly gradingService: GradingService,
    private readonly usersService: UsersService,
    @InjectRepository(Submission) private readonly submissionsRepo: Repository<Submission>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Process({ name: 'run', concurrency: 5 })
  async handleRun(job: Job): Promise<void> {
    const { submissionId, code, language, question } = job.data;
    this.logger.log(`[Job ${job.id}] Processing submission ${submissionId} [${language}]`);

    try {
      // ── Run Judge0 and Ollama AI grading IN PARALLEL ────────────────────
      // Total time = max(execution, AI) instead of execution + AI.
      const [executionResults, aiFeedback] = await Promise.all([
        this.executionService.runAllTestCases(code, language, question.testCases),
        this.gradingService.analyzeCodePublic(code, language, question.difficulty, question.problemStatement),
      ]);

      // ── Compute final score with real execution results + pre-fetched AI feedback
      const gradeResult = await this.gradingService.gradeWithFeedback(
        code, language, question.difficulty,
        question.problemStatement, question.testCases,
        executionResults, aiFeedback,
      );

      await this.submissionsRepo.update(submissionId, {
        status: SubmissionStatus.COMPLETED,
        score:       gradeResult.score,
        passed:      gradeResult.passed,
        testsPassed: gradeResult.testsPassed,
        testsTotal:  gradeResult.testsTotal,
        gradeResult: gradeResult as any,
      });

      // Invalidate status cache — isolated so a Redis hiccup doesn't
      // overwrite the COMPLETED status back to ERROR via the catch block
      try {
        await this.redis.del(`submission:status:${submissionId}`);
      } catch (redisErr: any) {
        this.logger.warn(`[Job ${job.id}] Redis cache invalidation failed (non-fatal): ${redisErr.message}`);
      }

      // Update student leaderboard stats
      const sub = await this.submissionsRepo.findOne({ where: { id: submissionId } });
      if (sub) {
        await this.usersService.updateProgressStats(sub.userId, gradeResult.passed, gradeResult.score);
      }

      this.logger.log(`[Job ${job.id}] Submission ${submissionId} DONE — score: ${gradeResult.score}`);
    } catch (err: any) {
      this.logger.error(`[Job ${job.id}] Submission ${submissionId} FAILED: ${err.message}`);
      await this.submissionsRepo.update(submissionId, { status: SubmissionStatus.ERROR });

      // Invalidate cache so frontend stops polling stale 'running' status
      try {
        await this.redis.del(`submission:status:${submissionId}`);
      } catch { /* non-fatal */ }

      throw err; // Re-throw so Bull retries with exponential backoff
    }
  }
}
