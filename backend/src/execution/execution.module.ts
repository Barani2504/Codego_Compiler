import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { ExecutionService } from './execution.service';
import { ExecutionProcessor } from './execution.processor';
import { GradingModule } from '../grading/grading.module';
import { UsersModule } from '../users/users.module';
import { Submission } from '../submissions/submission.entity';

/**
 * ExecutionModule owns:
 *  - ExecutionService  (submit to Judge0 — used by SubmissionsModule for "Run" button)
 *  - ExecutionProcessor (Bull worker — runs inside worker containers)
 *
 * The 'execution' queue is registered here so the processor can consume jobs.
 * SubmissionsModule also registers the same queue to produce (enqueue) jobs.
 * Both registrations share the same Redis-backed queue via the global BullModule.forRoot.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'execution' }),
    TypeOrmModule.forFeature([Submission]), // Processor updates Submission rows
    GradingModule,
    UsersModule,
  ],
  providers: [ExecutionService, ExecutionProcessor],
  exports: [ExecutionService],
})
export class ExecutionModule {}
