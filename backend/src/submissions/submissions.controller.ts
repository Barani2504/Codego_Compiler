import {
  Controller, Post, Get, Body, Param, UseGuards, Request,
  NotFoundException, ParseUUIDPipe, ForbiddenException, Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SubmissionsService } from './submissions.service';
import { SubmissionEventsService } from './submission-events.service';
import { SubmitCodeDto, RunCodeDto } from './dto/submission.dto';

@Controller('api/submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(
    private submissionsService: SubmissionsService,
    private eventsService: SubmissionEventsService,
  ) {}

  /**
   * Submit code — responds instantly with { submissionId, status: 'queued' }.
   * Rate-limited to allow reasonable submission frequency while preventing rapid spam.
   * The service also enforces no concurrent RUNNING submission per user.
   */
  @Throttle({ default: { ttl: 10000, limit: 2 } }) // Max 2 per 10s per IP
  @Post()
  async submit(@Request() req: any, @Body() body: SubmitCodeDto) {
    return this.submissionsService.submitCode(req.user.sub, body.questionId, body.code, body.language, body.timeTakenSeconds);
  }

  /**
   * Run code without submitting (test-before-submit).
   * Limited to 3 test cases in DTO; throttled at 10/min for rapid testing.
   */
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('run')
  async runCode(@Request() req: any, @Body() body: RunCodeDto) {
    return this.submissionsService.runCode(body.code, body.language, body.testCases);
  }

  /**
   * SSE endpoint — client opens EventSource and receives a single terminal
   * event (completed | error) then the stream closes.
   *
   * Cross-node fan-out: every API node subscribes to Redis 'submission:events';
   * each node only forwards events for SSE connections *it* holds.
   *
   * NGINX config required: proxy_buffering off; proxy_read_timeout 3600s;
   * Falls back to GET :id/status polling for older browsers / firewalls.
   */
  @Sse(':id/status/stream')
  @UseGuards(JwtAuthGuard)
  streamStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Observable<MessageEvent> {
    return this.eventsService.register(id) as Observable<MessageEvent>;
  }

  /**
   * Lightweight status endpoint — kept as a fallback for clients that cannot
   * establish SSE (old browsers, restrictive campus firewalls, Electron kiosk).
   * Response is Redis-cached for 2s.
   */
  @Get(':id/status')
  async getStatus(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Request() req: any) {
    // Verify the submission belongs to this user before returning status
    const status = await this.submissionsService.getStatus(id, req.user.sub);
    if (!status) throw new NotFoundException('Submission not found');
    return status;
  }

  /** Full submission detail — called once polling detects COMPLETED/ERROR */
  @Get(':id')
  async getDetail(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Request() req: any) {
    const sub = await this.submissionsService.getSubmissionById(id);
    if (!sub) throw new NotFoundException('Submission not found');
    if (sub.userId !== req.user.sub) throw new ForbiddenException('Access denied');

    // Strip hidden test cases from the question relation before returning
    if (sub.question?.testCases) {
      (sub.question as any).testCases = (sub.question.testCases as any[]).slice(0, 2);
    }
    // Strip expectedOutput from gradeResult.testDetails (keep input, passed, actualOutput)
    if (sub.gradeResult?.testDetails) {
      sub.gradeResult = {
        ...sub.gradeResult,
        testDetails: sub.gradeResult.testDetails.map((td: any) => ({
          index: td.index,
          input: td.input,
          passed: td.passed,
          actualOutput: td.actualOutput,
          // expectedOutput intentionally omitted
        })),
      };
    }
    return sub;
  }

  /** History list for student dashboard — only summary columns, no code/test cases */
  @Get()
  async getHistory(@Request() req: any) {
    return this.submissionsService.getStudentHistory(req.user.sub);
  }
}
