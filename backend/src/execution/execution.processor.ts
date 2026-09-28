import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Job } from 'bull';
import Redis from 'ioredis';

import { ExecutionService } from './execution.service';
import { GradingService } from '../grading/grading.service';
import { UsersService } from '../users/users.service';
import { TelemetryService } from '../telemetry/telemetry.service';
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
    private readonly telemetryService: TelemetryService,
    @InjectRepository(Submission) private readonly submissionsRepo: Repository<Submission>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Process({ name: 'run', concurrency: 5 })
  async handleRun(job: Job): Promise<void> {
    const { submissionId, code, language, question } = job.data;
    this.logger.log(`[Job ${job.id}] Processing submission ${submissionId} [${language}]`);

    // Transition from PENDING → RUNNING now that a worker has picked it up
    await this.submissionsRepo.update(submissionId, { status: SubmissionStatus.RUNNING });

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
        gradeResult: {
          ...gradeResult,
          timeTakenSeconds: job.data.timeTakenSeconds,
        } as any,
      });

      // ── Publish real-time event via Redis Pub/Sub for SSE delivery ──────
      // Any API node holding an open SSE connection for this submissionId
      // will forward this event to the client instantly — no polling needed.
      try {
        await this.redis.publish(
          'submission:events',
          JSON.stringify({
            submissionId,
            status: 'completed',
            score: gradeResult.score,
            passed: gradeResult.passed,
            testsPassed: gradeResult.testsPassed,
            testsTotal: gradeResult.testsTotal,
            degraded: gradeResult.aiFeedback?.degraded || false,
          }),
        );
      } catch (pubErr: any) {
        this.logger.warn(`[Job ${job.id}] Redis publish failed (non-fatal): ${pubErr.message}`);
      }

      // Invalidate status cache — isolated so a Redis hiccup doesn't
      // overwrite the COMPLETED status back to ERROR via the catch block
      try {
        await this.redis.del(`submission:status:${submissionId}`);
      } catch (redisErr: any) {
        this.logger.warn(`[Job ${job.id}] Redis cache invalidation failed (non-fatal): ${redisErr.message}`);
      }

      // ── Compute keystroke originality score (Feature 1) ───────────────────
      // Non-fatal: telemetry may be absent (e.g. demo mode, accessibility tools).
      // Score 100 = no mechanical evidence of non-organic entry (does NOT mean original).
      let originalityScore = 100;
      try {
        originalityScore = await this.telemetryService.computeOriginalityScore(submissionId);
        // Persist originality score into gradeResult for faculty audits
        await this.submissionsRepo.update(submissionId, {
          gradeResult: {
            ...gradeResult,
            timeTakenSeconds: job.data.timeTakenSeconds,
            originalityScore,
          } as any,
        });
      } catch (telErr: any) {
        this.logger.warn(`[Job ${job.id}] Originality score failed (non-fatal): ${telErr.message}`);
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

      // Publish error event for SSE consumers
      try {
        await this.redis.publish(
          'submission:events',
          JSON.stringify({ submissionId, status: 'error' }),
        );
      } catch { /* non-fatal */ }

      // Invalidate cache so frontend stops polling stale 'running' status
      try {
        await this.redis.del(`submission:status:${submissionId}`);
      } catch { /* non-fatal */ }

      throw err; // Re-throw so Bull retries with exponential backoff
    }
  }
}
