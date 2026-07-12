import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProgressService } from './progress.service';

@Controller('api/profile')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Get()
  async getProfile(@Request() req: any) {
    return this.progressService.getStudentProfile(req.user.sub);
  }
}
