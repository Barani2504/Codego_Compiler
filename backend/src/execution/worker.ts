import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionModule } from './execution.module';
import { RedisModule } from '../common/redis/redis.module';
import { ConfigModule } from '@nestjs/config';
import { User } from '../users/user.entity';
import { Question } from '../questions/question.entity';
import { Submission } from '../submissions/submission.entity';

import { getRedisConfig } from '../common/redis/redis-config.util';
import { getDatabaseConfig } from '../common/database/db-config.util';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...getDatabaseConfig(),
      entities: [User, Question, Submission],
      synchronize: process.env.NODE_ENV !== 'production' || process.env.DB_SYNC === 'true',
      poolSize: 5,
    }),
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
        };
      },
    }),
    // Register the run-code queue so workers also process run-code jobs
    BullModule.registerQueue({ name: 'run-code' }),
    RedisModule,
    ExecutionModule,
  ],
})
class WorkerAppModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerAppModule);
  console.log('🔧 CodeGoAI Worker running — consuming execution queue...');
  // No HTTP — workers only consume Bull jobs
}
bootstrap();
