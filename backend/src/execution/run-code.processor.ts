import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import type { Job } from 'bull';
import Redis from 'ioredis';

import { ExecutionService } from './execution.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';

/**
 * RunCodeProcessor — Bull worker for the "Run Code" (test-before-submit) flow.
 *
 * Previously, runCode() called Judge0 synchronously from the API handler,
 * bypassing all queue-based backpressure. Under 2,000 concurrent "Run" clicks
 * this saturated the NestJS event loop and overwhelmed Judge0.
 *
 * Now:
 *   1. API handler pushes a job to the 'run-code' Bull queue (high priority).
 *   2. This processor picks it up and runs test cases via ExecutionService.
 *   3. Results are published back to Redis Pub/Sub (`run:result:<jobId>`).
 *   4. The API handler awaits the Pub/Sub message (30s timeout) and returns.
 *
 * concurrency: 10 — each worker process handles 10 run-code jobs
 * simultaneously. With 4–6 worker containers → 40–60 concurrent run-code
 * executions before any job has to wait.
 */
@Processor('run-code')
export class RunCodeProcessor {
  private readonly logger = new Logger(RunCodeProcessor.name);

  constructor(
    private readonly executionService: ExecutionService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Process({ name: 'run', concurrency: 10 })
  async handleRun(job: Job): Promise<void> {
    const { jobId, code, language, testCases } = job.data;
    this.logger.log(`[RunCode Job ${job.id}] Processing ${testCases.length} test case(s) [${language}]`);

    try {
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
                input: tc.input, passed: false,
                output: result.stderr || result.output || result.statusDesc, expected,
                exitCode: result.exitCode, statusId: result.statusId,
                statusDesc: result.statusDesc, isError: true,
              };
            } else {
              // ── JSON-aware comparison for JS function-call results ─────
              let passed = false;
              try {
                const actualParsed = JSON.parse(actual);
                const expectedParsed = JSON.parse(expected);
                passed = JSON.stringify(actualParsed) === JSON.stringify(expectedParsed);
              } catch {
                // Fall back to whitespace-normalized token comparison
                const actualTokens = actual.split(/\s+/).filter(t => t.length > 0);
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
        }),
      );

      // Publish results back to the waiting API handler via Redis Pub/Sub
      await this.redis.publish(
        `run:result:${jobId}`,
        JSON.stringify({ status: 'completed', results }),
      );

      this.logger.log(`[RunCode Job ${job.id}] Completed — ${results.filter((r: any) => r.passed).length}/${results.length} passed`);
    } catch (err: any) {
      this.logger.error(`[RunCode Job ${job.id}] Failed: ${err.message}`);

      // Publish error back so the API handler doesn't hang
      try {
        await this.redis.publish(
          `run:result:${jobId}`,
          JSON.stringify({
            status: 'error',
            error: err.message || 'Internal execution error',
          }),
        );
      } catch { /* non-fatal */ }

      throw err; // Re-throw so Bull retries
    }
  }
}
