import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { Submission } from './submission.entity';
import { Question } from '../questions/question.entity';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { UsersModule } from '../users/users.module';
import { GradingModule } from '../grading/grading.module';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Question]),
    // Register queue here so SubmissionsService can @InjectQueue('execution')
    // to produce jobs. ExecutionModule registers the same queue to consume them.
    BullModule.registerQueue({ name: 'execution' }),
    UsersModule,
    GradingModule,
    ExecutionModule, // Provides ExecutionService for the "Run Code" endpoint
  ],
  providers: [SubmissionsService],
  controllers: [SubmissionsController],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
