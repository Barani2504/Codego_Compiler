import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { QuestionsModule } from './questions/questions.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { GradingModule } from './grading/grading.module';
import { ExecutionModule } from './execution/execution.module';
import { ResultsModule } from './results/results.module';
import { ProgressModule } from './progress/progress.module';
import { FacultyModule } from './faculty/faculty.module';
import { RedisModule } from './common/redis/redis.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { User } from './users/user.entity';
import { Question } from './questions/question.entity';
import { Submission } from './submissions/submission.entity';
import { KeystrokeWindow } from './telemetry/entities/keystroke-window.entity';
import { CodeDelta } from './telemetry/entities/code-delta.entity';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Global rate limiter: max 120 requests per 60s per USER ──────────────────────────────
    // UserThrottlerGuard keys by JWT user ID (not IP) so 2,000 students behind
    // a campus NAT each get their own rate-limit bucket.
    // Submission endpoint applies its own stricter per-user limit via @Throttle.
    // Storage: Redis-backed so rate limits are enforced consistently across all
    // clustered API nodes. Without this, a user could exceed limits by being
    // load-balanced to different nodes (each with its own in-memory counter).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 120 }],
      storage: new ThrottlerStorageRedisService({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        // Only set password if the env var is actually provided and non-empty
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
        // Upstash requires TLS — enabled via REDIS_TLS=true in production
        ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
      }),
    }),

    // ── Database via PgBouncer ───────────────────────────────────────────────
    // In Docker: DB_HOST=pgbouncer, DB_PORT=6432.
    // poolSize: 5 per instance × 4 instances = 20 TypeORM connections.
    // PgBouncer (DEFAULT_POOL_SIZE=25) multiplexes these into 25 real
    // Postgres connections — well within Postgres max_connections=100.
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'platform_user',
      password: process.env.DB_PASS || 'yourpassword',
      database: process.env.DB_NAME || 'coding_platform',
      entities: [User, Question, Submission, KeystrokeWindow, CodeDelta],
      // ⚠️  PRODUCTION: set NODE_ENV=production and use TypeORM migrations.
      // synchronize: true auto-alters the DB schema on every restart — safe in
      // dev, but DANGEROUS in production (it can drop columns without warning).
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      // ── Neon requires SSL in production ────────────────────────────────────
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      // ── Connection Pool Config (per instance) ──────────────────────────────
      poolSize: 5,                       // PgBouncer handles the rest
      connectTimeoutMS: 5000,
      extra: {
        idleTimeoutMillis: 10000,        // faster idle release through bouncer
        connectionTimeoutMillis: 5000,
      },
    }),

    // ── Bull Queue with dedicated Redis (noeviction) ───────────────────────
    // Bull connects to redis-queue (a separate Redis instance with noeviction
    // policy) so queued jobs are NEVER silently dropped under memory pressure.
    // The app-cache Redis (REDIS_HOST) uses allkeys-lru for the status cache.
    BullModule.forRoot({
      redis: {
        host: process.env.BULL_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.BULL_REDIS_PORT || process.env.REDIS_PORT || '6379'),
        // Only send AUTH when REDIS_PASSWORD is actually set — empty string causes NOAUTH
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
        // Upstash requires TLS — enabled via REDIS_TLS=true in production
        ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {}),
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
      },
      defaultJobOptions: {
        attempts: 3,                    // retry a failed job 3 times
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,          // keep last 100 completed jobs in Redis
        removeOnFail: 200,              // keep last 200 failed jobs for debugging
      },
      // ── Backpressure limiter ──────────────────────────────────────────────
      // Prevents a submission stampede (10,000 students auto-submitting at
      // exam close) from saturating Judge0 and Ollama simultaneously.
      // Instead of timeouts, submissions degrade to "slower results".
      limiter: {
        max: 100,       // max 100 jobs processed per second across all workers
        duration: 1000, // per 1000ms window
      },
    }),

    AuthModule,
    UsersModule,
    QuestionsModule,
    SubmissionsModule,
    GradingModule,
    ExecutionModule,
    ResultsModule,
    ProgressModule,
    FacultyModule,
    RedisModule,   // Global — provides REDIS_CLIENT to every module
    TelemetryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally to all controllers.
    // UserThrottlerGuard keys by authenticated user ID (JWT sub) instead of
    // client IP — essential for campus NAT environments with 2,000+ students.
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
