import { Injectable, Logger, Inject, ConflictException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

import { Submission, SubmissionStatus } from './submission.entity';
import { Question } from '../questions/question.entity';
import { UsersService } from '../users/users.service';
import { GradingService } from '../grading/grading.service';
import { ExecutionService } from '../execution/execution.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { createRedisClient } from '../common/redis/redis-config.util';

/** How long (seconds) to cache a submission status response in Redis.
 *  Frontend polls every 2s — a 2s TTL means at most one extra DB query per cycle. */
const STATUS_CACHE_TTL = 2;

/** Timeout (ms) for waiting for a run-code result from the Bull worker */
const RUN_CODE_TIMEOUT_MS = 30000;

@Injectable()
export class SubmissionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubmissionsService.name);
  private runCodeSubscriber: Redis;

  constructor(
    @InjectRepository(Submission) private submissionsRepo: Repository<Submission>,
    @InjectRepository(Question)   private questionsRepo:   Repository<Question>,
    @InjectQueue('execution')     private execQueue:       Queue,
    @InjectQueue('run-code')      private runCodeQueue:    Queue,
    @Inject(REDIS_CLIENT)         private redis:           Redis,
    private usersService:   UsersService,
    private gradingService: GradingService,
    private executionService: ExecutionService,
  ) {}

  /**
   * Initialize a dedicated Redis subscriber for receiving run-code results.
   * This connection stays in subscriber mode and cannot run other commands.
   */
  onModuleInit() {
    this.runCodeSubscriber = createRedisClient({
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });

    this.runCodeSubscriber.on('error', (err) =>
      this.logger.error(`[RunCode-Subscriber] Redis error: ${err.message}`),
    );
  }

  onModuleDestroy() {
    this.runCodeSubscriber?.disconnect();
  }

  // ── Submit: persist → enqueue → respond instantly ─────────────────────────
  async submitCode(userId: string, questionId: string, code: string, language: string, timeTakenSeconds?: number) {
    const question = await this.questionsRepo.findOne({ where: { id: questionId } });
    if (!question) throw new ConflictException('Question not found');

    // Guard: prevent a user from having multiple PENDING/RUNNING submissions simultaneously
    const active = await this.submissionsRepo.findOne({
      where: [
        { userId, status: SubmissionStatus.PENDING },
        { userId, status: SubmissionStatus.RUNNING },
      ],
    });
    if (active) {
      throw new ConflictException(
        'You already have a submission in progress. Please wait for it to complete before submitting again.',
      );
    }

    // Save with PENDING status — the processor transitions it to RUNNING when picked up
    const submission = await this.submissionsRepo.save(
      this.submissionsRepo.create({
        userId, questionId, code, language,
        difficulty: question.difficulty,
        status: SubmissionStatus.PENDING,
        gradeResult: timeTakenSeconds ? { timeTakenSeconds } : null,
      }),
    );

    // Enqueue — Bull handles retries, back-pressure, and concurrency
    await this.execQueue.add(
      'run',
      {
        submissionId: submission.id,
        code,
        language,
        timeTakenSeconds,
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
        timeout:          600000, // 10-min hard cap
      },
    );

    // Respond instantly — frontend polls GET /submissions/:id/status
    return { submissionId: submission.id, status: 'queued' };
  }

  /**
   * Lightweight endpoint used for high-frequency polling.
   * Caches the non-terminal status in Redis for 2s so the DB is protected.
   * Validates that the submission belongs to the requesting user.
   */
  async getStatus(id: string, userId?: string): Promise<{ status: SubmissionStatus }> {
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
      select: ['status', 'userId'],
    });

    if (!sub) throw new Error('Submission not found');

    // Ownership check: only the owning student (or no userId passed = internal use) may poll
    if (userId && sub.userId !== userId) throw new Error('Submission not found');

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

  // ── "Run Code" — direct execution via ExecutionService (test-before-submit) ──
  async runCode(
    code: string,
    language: string,
    testCases: { input: string; expectedOutput: any }[],
  ) {
    const results = await Promise.all(
      testCases.map(async (tc: { input: string; expectedOutput: any }) => {
        const expectedRaw = Array.isArray(tc.expectedOutput)
          ? tc.expectedOutput.join('\n')
          : String(tc.expectedOutput ?? '');

        try {
          const result = await this.executionService.runSingle(code, language, tc.input);
          const expected = expectedRaw.trim();
          const actual = (result.output || '').trim();

          if (result.exitCode !== 0 || result.statusId === 6) {
            return {
              input: tc.input,
              passed: false,
              output: result.stderr || result.output || result.statusDesc,
              expected,
              exitCode: result.exitCode,
              statusId: result.statusId,
              statusDesc: result.statusDesc,
              isError: true,
            };
          }

          // JSON-aware comparison for JS function results
          let passed = false;
          try {
            const actualParsed = JSON.parse(actual);
            const expectedParsed = JSON.parse(expected);
            passed = JSON.stringify(actualParsed) === JSON.stringify(expectedParsed);
          } catch {
            const actualTokens = actual.split(/\s+/).filter((t) => t.length > 0);
            const expectedTokens = expected.split(/\s+/).filter((t) => t.length > 0);
            passed =
              actualTokens.length === expectedTokens.length &&
              actualTokens.every((t, i) => t === expectedTokens[i]);
          }

          return {
            input: tc.input,
            passed,
            output: actual,
            expected,
            exitCode: 0,
            statusId: result.statusId,
            statusDesc: result.statusDesc,
            stderr: result.stderr,
            isError: false,
          };
        } catch (err: any) {
          return {
            input: tc.input,
            passed: false,
            output: err.message || 'Execution error',
            expected: expectedRaw?.trim() ?? '',
            exitCode: 1,
            statusId: 13,
            statusDesc: 'Internal Error',
            isError: true,
          };
        }
      }),
    );

    return results;
  }

  /**
   * Student submission history — returns only summary columns.
   * Code text and question test cases are intentionally excluded.
   */
  async getStudentHistory(userId: string) {
    const submissions = await this.submissionsRepo.find({
      where: { userId },
      select: ['id', 'language', 'difficulty', 'status', 'score', 'passed', 'testsPassed', 'testsTotal', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return submissions;
  }
}
