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
    const redisPassword = process.env.REDIS_PASSWORD || '';
    this.runCodeSubscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      ...(redisPassword ? { password: redisPassword } : {}),
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

  // ── "Run Code" — queued via Bull (test-before-submit) ────────────────────
  // Previously this was synchronous with pLimit(3), which bypassed all
  // backpressure. Now it pushes a high-priority job to the 'run-code' queue
  // and waits for the result via Redis Pub/Sub (30s timeout).
  async runCode(
    code: string,
    language: string,
    testCases: { input: string; expectedOutput: any }[],
  ) {
    const jobId = randomUUID();
    const channel = `run:result:${jobId}`;

    // Set up a promise that resolves when the worker publishes results
    const resultPromise = new Promise<any[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.runCodeSubscriber.unsubscribe(channel).catch(() => {});
        reject(new Error('Code execution timed out. Please try again.'));
      }, RUN_CODE_TIMEOUT_MS);

      this.runCodeSubscriber.subscribe(channel, (err) => {
        if (err) {
          clearTimeout(timeout);
          reject(new Error(`Failed to subscribe for run-code results: ${err.message}`));
        }
      });

      const messageHandler = (_ch: string, raw: string) => {
        if (_ch !== channel) return;
        clearTimeout(timeout);
        this.runCodeSubscriber.removeListener('message', messageHandler);
        this.runCodeSubscriber.unsubscribe(channel).catch(() => {});

        try {
          const payload = JSON.parse(raw);
          if (payload.status === 'error') {
            reject(new Error(payload.error || 'Execution failed'));
          } else {
            resolve(payload.results);
          }
        } catch (parseErr: any) {
          reject(new Error(`Failed to parse run-code result: ${parseErr.message}`));
        }
      };

      this.runCodeSubscriber.on('message', messageHandler);
    });

    // Enqueue the run-code job with high priority
    await this.runCodeQueue.add(
      'run',
      { jobId, code, language, testCases },
      {
        priority:         1,        // Higher priority than graded submissions
        attempts:         2,
        backoff:          { type: 'fixed', delay: 1000 },
        removeOnComplete: 50,
        removeOnFail:     20,
        timeout:          35000,    // Slightly longer than our client timeout
      },
    );

    // Wait for the worker to publish results (or timeout)
    return resultPromise;
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
