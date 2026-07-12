import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import Redis from 'ioredis';

import { Submission, SubmissionStatus } from './submission.entity';
import { Question } from '../questions/question.entity';
import { UsersService } from '../users/users.service';
import { GradingService } from '../grading/grading.service';
import { ExecutionService } from '../execution/execution.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';

/** How long (seconds) to cache a submission status response in Redis.
 *  Frontend polls every 2s — a 2s TTL means at most one extra DB query per cycle. */
const STATUS_CACHE_TTL = 2;

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(Submission) private submissionsRepo: Repository<Submission>,
    @InjectRepository(Question)   private questionsRepo:   Repository<Question>,
    @InjectQueue('execution')     private execQueue:       Queue,
    @Inject(REDIS_CLIENT)         private redis:           Redis,
    private usersService:   UsersService,
    private gradingService: GradingService,
    private executionService: ExecutionService,
  ) {}

  // ── Submit: persist → enqueue → respond instantly ─────────────────────────
  async submitCode(userId: string, questionId: string, code: string, language: string) {
    const question = await this.questionsRepo.findOne({ where: { id: questionId } });
    if (!question) throw new Error('Question not found');

    // Save with RUNNING status immediately so frontend can poll
    const submission = await this.submissionsRepo.save(
      this.submissionsRepo.create({
        userId, questionId, code, language,
        difficulty: question.difficulty,
        status: SubmissionStatus.RUNNING,
      }),
    );

    // Enqueue — Bull handles retries, back-pressure, and concurrency
    await this.execQueue.add(
      'run',
      {
        submissionId: submission.id,
        code,
        language,
        question: {
          difficulty:       question.difficulty,
          problemStatement: question.problemStatement,
          testCases:        question.testCases,
        },
      },
      {
        attempts:         3,
        backoff:          { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail:     50,
        timeout:          600000, // 10-min hard cap — Bull auto-fails & retries if processor hangs
      },
    );

    // Respond instantly — frontend polls GET /submissions/:id/status
    return { submissionId: submission.id, status: 'queued' };
  }

  /**
   * Lightweight endpoint used for high-frequency polling.
   * Caches the 'running' status in Redis for 2s so the DB is protected.
   */
  async getStatus(id: string): Promise<{ status: SubmissionStatus }> {
    const cacheKey = `submission:status:${id}`;
    let cachedStatus: string | null = null;
    
    try {
      cachedStatus = await this.redis.get(cacheKey);
    } catch (err: any) {
      this.logger.warn(`Redis get failed for status poll, falling back to DB: ${err.message}`);
    }

    if (cachedStatus) {
      return { status: cachedStatus as SubmissionStatus };
    }

    const sub = await this.submissionsRepo.findOne({
      where: { id },
      select: ['status'], // Only fetch status column
    });

    if (!sub) throw new Error('Submission not found');

    // Only cache transient states to avoid stale completed states
    if (sub.status !== SubmissionStatus.COMPLETED && sub.status !== SubmissionStatus.ERROR) {
      try {
        await this.redis.setex(cacheKey, STATUS_CACHE_TTL, sub.status);
      } catch { /* non-fatal */ }
    }

    return { status: sub.status };
  }

  // ── Full submission detail (no cache — used after polling stops) ──────────
  async getSubmissionById(id: string) {
    return this.submissionsRepo.findOne({ where: { id }, relations: ['question'] });
  }

  // ── "Run Code" — immediate, NOT queued (used for test-before-submit) ──────
  async runCode(
    code: string,
    language: string,
    testCases: { input: string; expectedOutput: any }[],
  ) {
    const promises = testCases.map(async (tc) => {
      const expectedRaw = Array.isArray(tc.expectedOutput)
        ? tc.expectedOutput.join('\n')
        : String(tc.expectedOutput ?? '');

      try {
        const result = await this.executionService.runSingle(code, language, tc.input);
        const expected = expectedRaw.trim();
        const actual   = (result.output || '').trim();

        if (result.exitCode !== 0 || result.statusId === 6) {
          return {
            input: tc.input, passed: false,
            output: result.stderr || result.statusDesc, expected,
            exitCode: result.exitCode, statusId: result.statusId,
            statusDesc: result.statusDesc, isError: true,
          };
        } else {
          // ── JSON-aware comparison for JS function-call results ─────────────
          // JS test cases store expectedOutput as JSON (e.g. "true", "[1,2]").
          // Compare parsed values if possible, fall back to token comparison.
          let passed = false;
          try {
            const actualParsed   = JSON.parse(actual);
            const expectedParsed = JSON.parse(expected);
            passed = JSON.stringify(actualParsed) === JSON.stringify(expectedParsed);
          } catch {
            // Fall back to whitespace-normalized token comparison (for non-JSON output)
            const actualTokens   = actual.split(/\s+/).filter(t => t.length > 0);
            const expectedTokens = expected.split(/\s+/).filter(t => t.length > 0);
            passed =
              actualTokens.length === expectedTokens.length &&
              actualTokens.every((t, i) => t === expectedTokens[i]);
          }

          return {
            input: tc.input, passed, output: actual, expected,
            exitCode: 0, statusId: result.statusId,
            statusDesc: result.statusDesc, stderr: result.stderr, isError: false,
          };
        }
      } catch (err: any) {
        return {
          input: tc.input, passed: false,
          output: err.message || 'Execution error',
          expected: expectedRaw?.trim() ?? '',
          exitCode: 1, statusId: 13, statusDesc: 'Internal Error', isError: true,
        };
      }
    });

    return Promise.all(promises);
  }

  async getStudentHistory(userId: string) {
    return this.submissionsRepo.find({
      where: { userId },
      relations: ['question'],
      order: { createdAt: 'DESC' },
    });
  }
}
