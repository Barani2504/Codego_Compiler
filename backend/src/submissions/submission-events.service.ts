import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import Redis from 'ioredis';

/**
 * SubmissionEventsService — Cross-node fan-out for SSE delivery.
 *
 * Problem: a submission is enqueued by whichever API node received the POST,
 * but the Bull worker that completes the job may notify a *different* API node
 * than the one holding the client's open SSE connection.
 *
 * Solution: every API node subscribes to the shared Redis Pub/Sub channel
 * 'submission:events'. When an event arrives, this service checks whether
 * *this* node has an open SSE stream for that submissionId and only forwards
 * it if so. This is O(1) per event per node.
 *
 * The subscriber uses a DEDICATED Redis connection (not the shared cache client)
 * because ioredis in subscriber mode can't run other commands on the same conn.
 */
@Injectable()
export class SubmissionEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubmissionEventsService.name);
  private readonly streams = new Map<string, Subject<MessageEvent>>();
  private subscriber: Redis;

  onModuleInit() {
    // Dedicated Redis connection for Pub/Sub — separate from the cache client.
    // Only pass `password` when REDIS_PASSWORD is actually set; sending an
    // empty/undefined password string to a Redis with no auth causes NOAUTH loops.
    const redisPassword = process.env.REDIS_PASSWORD || '';
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      ...(redisPassword ? { password: redisPassword } : {}),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
    });

    this.subscriber.on('error', (err) =>
      this.logger.error(`[SSE-Subscriber] Redis error: ${err.message}`),
    );

    this.subscriber.subscribe('submission:events', (err) => {
      if (err) {
        this.logger.error(`Failed to subscribe to submission:events: ${err.message}`);
      } else {
        this.logger.log('Subscribed to Redis channel: submission:events');
      }
    });

    this.subscriber.on('message', (_channel: string, raw: string) => {
      try {
        const evt = JSON.parse(raw);
        const stream = this.streams.get(evt.submissionId);
        if (stream) {
          // Forward the event to the SSE connection held by this node
          stream.next({ data: evt } as MessageEvent);
          stream.complete(); // Terminal state — submission is done
          this.streams.delete(evt.submissionId);
        }
        // If this node doesn't hold the SSE connection → ignore silently
      } catch (err: any) {
        this.logger.warn(`Failed to parse submission event: ${err.message}`);
      }
    });
  }

  onModuleDestroy() {
    // Clean up all pending streams and the subscriber connection
    for (const [, stream] of this.streams) {
      stream.complete();
    }
    this.streams.clear();
    this.subscriber?.disconnect();
  }

  /**
   * Register a new SSE stream for the given submissionId.
   * The returned Observable emits exactly one MessageEvent when the
   * submission reaches a terminal state (completed/error), then completes.
   */
  register(submissionId: string): Observable<MessageEvent> {
    // If there's already a stream for this submission (shouldn't happen,
    // but defensive), complete the old one first
    const existing = this.streams.get(submissionId);
    if (existing) {
      existing.complete();
    }

    const subject = new Subject<MessageEvent>();
    this.streams.set(submissionId, subject);

    // Safety: auto-cleanup after 20 minutes (matches the frontend MAX_ATTEMPTS)
    // to prevent leaked streams if the submission never completes
    const timeout = setTimeout(() => {
      if (this.streams.has(submissionId)) {
        this.streams.get(submissionId)?.complete();
        this.streams.delete(submissionId);
      }
    }, 20 * 60 * 1000);

    // When the subject completes (either from event or timeout), clear the timeout
    subject.subscribe({
      complete: () => clearTimeout(timeout),
    });

    return subject.asObservable();
  }

  /** Number of active SSE connections on this node (for monitoring) */
  getActiveStreamCount(): number {
    return this.streams.size;
  }
}
