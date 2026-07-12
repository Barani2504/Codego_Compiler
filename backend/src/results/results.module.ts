import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { SubmissionsModule } from '../submissions/submissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [SubmissionsModule, UsersModule],
  providers: [ResultsService],
  controllers: [ResultsController],
})
export class ResultsModule {}
