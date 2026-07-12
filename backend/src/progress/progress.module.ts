import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from '../submissions/submission.entity';
import { User } from '../users/user.entity';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Submission, User])],
  providers: [ProgressService],
  controllers: [ProgressController],
})
export class ProgressModule {}
