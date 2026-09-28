import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { Submission } from './submission.entity';
import { Question } from '../questions/question.entity';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { SubmissionEventsService } from './submission-events.service';
import { UsersModule } from '../users/users.module';
import { GradingModule } from '../grading/grading.module';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Question]),
    // Register queues here so SubmissionsService can @InjectQueue('execution')
    // and @InjectQueue('run-code') to produce jobs. ExecutionModule registers
    // the same queues to consume them.
    BullModule.registerQueue({ name: 'execution' }),
    BullModule.registerQueue({ name: 'run-code' }),
    UsersModule,
    GradingModule,
    ExecutionModule, // Provides ExecutionService for the "Run Code" endpoint
  ],
  providers: [SubmissionsService, SubmissionEventsService],
  controllers: [SubmissionsController],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
