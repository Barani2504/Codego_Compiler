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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'platform_user',
      password: process.env.DB_PASS || 'yourpassword',
      database: process.env.DB_NAME || 'coding_platform',
      entities: [User, Question, Submission],
      synchronize: process.env.NODE_ENV !== 'production',
      poolSize: 5,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.BULL_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.BULL_REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
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
