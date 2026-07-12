import { Controller, Post, Get, Body, Param, UseGuards, Request, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubmissionsService } from './submissions.service';

@Controller('api/submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private submissionsService: SubmissionsService) {}

  /** Submit code — responds instantly with { submissionId, status: 'queued' } */
  @Post()
  async submit(
    @Request() req: any,
    @Body() body: { questionId: string; code: string; language: string },
  ) {
    return this.submissionsService.submitCode(req.user.sub, body.questionId, body.code, body.language);
  }

  /** Run code without submitting (test-before-submit). Synchronous / immediate. */
  @Post('run')
  async runCode(
    @Request() req: any,
    @Body() body: { code: string; language: string; testCases: { input: string; expectedOutput: any }[] },
  ) {
    return this.submissionsService.runCode(body.code, body.language, body.testCases);
  }

  /**
   * Lightweight status endpoint — polled every 2s by the frontend while a
   * submission is processing. Response is Redis-cached for 2s, so 2000 students
   * polling simultaneously = at most ~1000 DB queries/s instead of 2000.
   */
  @Get(':id/status')
  async getStatus(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Request() req: any) {
    const status = await this.submissionsService.getStatus(id);
    if (!status) throw new NotFoundException('Submission not found');
    return status;
  }

  /** Full submission detail — called once polling detects COMPLETED/ERROR */
  @Get(':id')
  async getDetail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Request() req: any) {
    const sub = await this.submissionsService.getSubmissionById(id);
    if (!sub || sub.userId !== req.user.sub) throw new NotFoundException('Submission not found');
    return sub;
  }

  /** History list for student dashboard */
  @Get()
  async getHistory(@Request() req: any) {
    return this.submissionsService.getStudentHistory(req.user.sub);
  }
}
