import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Submission } from '../submissions/submission.entity';
import { User } from '../users/user.entity';
import { FacultyService } from './faculty.service';
import { FacultyController } from './faculty.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Submission, User])],
  providers: [FacultyService],
  controllers: [FacultyController],
})
export class FacultyModule {}
