import { Injectable, Logger } from '@nestjs/common';

/**
 * Circuit-breaker for the Ollama AI grading engine.
 *
 * States:
 *   CLOSED    → normal operation; failures are counted
 *   OPEN      → all calls short-circuit to fallback for OPEN_DURATION_MS
 *   HALF_OPEN → one probe call is allowed through; success → CLOSED, failure → OPEN
 *
 * This prevents a crashed / VRAM-exhausted Ollama instance from blocking
 * every grading request until the HTTP timeout expires — and, critically,
 * from delaying the deterministic test results students are waiting on
 * (because ExecutionProcessor runs Judge0 and Ollama in Promise.all).
 */
type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Injectable()
export class OllamaCircuitBreakerService {
  private state: BreakerState = 'CLOSED';
  private failureCount = 0;
  private lastFailureAt = 0;

  /** Consecutive failures within the window before the circuit opens */
  private readonly FAILURE_THRESHOLD = 5;
  /** How long the circuit stays open before allowing a probe (ms) */
  private readonly OPEN_DURATION_MS = 30_000;
  /** Hard timeout per Ollama call — generous enough for local quantized LLMs on CPU/iGPU (ms) */
  private readonly REQUEST_TIMEOUT_MS = 30_000;

  private readonly logger = new Logger(OllamaCircuitBreakerService.name);

  /**
   * Execute `fn` through the circuit breaker.
   * If the circuit is open, `fallback` is returned immediately without
   * calling Ollama at all — this is the key latency win.
   */
  async execute<T>(fn: () => Promise<T>, fallback: () => T, timeoutMs?: number): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureAt > this.OPEN_DURATION_MS) {
        this.state = 'HALF_OPEN';
        this.logger.log('Ollama circuit transitioning OPEN → HALF_OPEN (probing)');
      } else {
        this.logger.warn('Ollama circuit OPEN — using deterministic-only fallback');
        return fallback();
      }
    }

    const effectiveTimeout = timeoutMs || this.REQUEST_TIMEOUT_MS;
    try {
      const result = await this.withTimeout(fn(), effectiveTimeout);
      this.onSuccess();
      return result;
    } catch (err: any) {
      this.onFailure();
      this.logger.error(`Ollama call failed (${this.state}, failures: ${this.failureCount}): ${err.message}`);
      return fallback();
    }
  }

  /** Get current circuit state — useful for health checks / dashboards */
  getState(): BreakerState {
    return this.state;
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.logger.log('Ollama circuit recovered: HALF_OPEN → CLOSED');
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureAt = Date.now();
    if (this.failureCount >= this.FAILURE_THRESHOLD) {
      if (this.state !== 'OPEN') {
        this.logger.error(
          `Ollama circuit OPEN after ${this.failureCount} consecutive failures — ` +
          `all AI grading will fall back to deterministic-only for ${this.OPEN_DURATION_MS / 1000}s`,
        );
      }
      this.state = 'OPEN';
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Ollama request timed out after ${ms}ms`)), ms),
      ),
    ]);
  }
}
