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
import { getRedisConfig, createRedisClient } from './common/redis/redis-config.util';
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
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const client = createRedisClient({
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          lazyConnect: true,
        });
        return {
          throttlers: [{ ttl: 60000, limit: 120 }],
          storage: new ThrottlerStorageRedisService(client),
        };
      },
    }),

    // ── Database (Neon / PgBouncer / Local Postgres) ─────────────────────────
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? {
            url: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
          }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USER || 'platform_user',
            password: process.env.DB_PASS || 'yourpassword',
            database: process.env.DB_NAME || 'coding_platform',
            ssl:
              process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false,
          }),
      entities: [User, Question, Submission, KeystrokeWindow, CodeDelta],
      synchronize: process.env.NODE_ENV !== 'production' || process.env.DB_SYNC === 'true',
      logging: process.env.NODE_ENV === 'development',
      poolSize: 5,
      connectTimeoutMS: 10000,
      extra: {
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        ...(process.env.DATABASE_URL ||
        process.env.NODE_ENV === 'production' ||
        process.env.DB_SSL === 'true'
          ? { ssl: { rejectUnauthorized: false } }
          : {}),
      },
    }),

    // ── Bull Queue with dedicated Redis (Upstash / Local Redis) ────────────
    BullModule.forRootAsync({
      useFactory: () => {
        const { url, options } = getRedisConfig();
        if (url) {
          return {
            url,
            redis: {
              ...options,
              maxRetriesPerRequest: null,
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: 100,
              removeOnFail: 200,
            },
            limiter: {
              max: 100,
              duration: 1000,
            },
          };
        }
        return {
          redis: {
            ...options,
            host: process.env.BULL_REDIS_HOST || options.host || 'localhost',
            port: parseInt(
              process.env.BULL_REDIS_PORT || (options.port ? String(options.port) : '6379'),
              10,
            ),
            maxRetriesPerRequest: null,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
          limiter: {
            max: 100,
            duration: 1000,
          },
        };
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
