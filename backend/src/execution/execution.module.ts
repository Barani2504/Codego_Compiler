import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { ExecutionService } from './execution.service';
import { ExecutionProcessor } from './execution.processor';
import { RunCodeProcessor } from './run-code.processor';
import { GradingModule } from '../grading/grading.module';
import { UsersModule } from '../users/users.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { Submission } from '../submissions/submission.entity';

/**
 * ExecutionModule owns:
 *  - ExecutionService  (submit to Judge0 — used by SubmissionsModule for "Run" button)
 *  - ExecutionProcessor (Bull worker — runs inside worker containers for graded submissions)
 *  - RunCodeProcessor  (Bull worker — runs "Run Code" test-before-submit jobs)
 *
 * The 'execution' queue is registered here so the processor can consume jobs.
 * The 'run-code' queue handles the previously-synchronous "Run Code" requests
 * with proper backpressure (prevents 2,000 concurrent Judge0 calls).
 * SubmissionsModule also registers both queues to produce (enqueue) jobs.
 * Both registrations share the same Redis-backed queue via the global BullModule.forRoot.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'execution' }),
    BullModule.registerQueue({ name: 'run-code' }),
    TypeOrmModule.forFeature([Submission]), // Processor updates Submission rows
    GradingModule,
    UsersModule,
    TelemetryModule,  // Provides TelemetryService for originality scoring
  ],
  providers: [ExecutionService, ExecutionProcessor, RunCodeProcessor],
  exports: [ExecutionService],
})
export class ExecutionModule {}

