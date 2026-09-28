import {
  Body, Controller, Get, Param, Post,
  ParseUUIDPipe, UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TelemetryService } from './telemetry.service';
import { TelemetryWindowDto, CodeDeltaBatchDto } from './dto/telemetry-window.dto';
import { UserRole } from '../users/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('api/submissions/:id/telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  /**
   * Ingest a 2.5-second windowed feature vector from the Monaco editor.
   * Called silently by the frontend during assessment — no raw keystrokes stored.
   */
  @Post()
  ingestWindow(
    @Param('id', new ParseUUIDPipe({ version: '4' })) submissionId: string,
    @Body() dto: TelemetryWindowDto,
  ) {
    return this.telemetryService.recordWindow(submissionId, dto);
  }

  /**
   * Ingest a batch of Monaco editor change deltas for time-travel playback.
   * Batched in the client every 2.5s alongside the keystroke window.
   */
  @Post('deltas')
  ingestDeltas(
    @Param('id', new ParseUUIDPipe({ version: '4' })) submissionId: string,
    @Body() dto: CodeDeltaBatchDto,
  ) {
    return this.telemetryService.recordDeltas(submissionId, dto);
  }

  /**
   * Retrieve ordered deltas for faculty time-travel playback.
   * Faculty-only: students cannot view another student's replay.
   */
  @Get('deltas')
  async getDeltas(
    @Param('id', new ParseUUIDPipe({ version: '4' })) submissionId: string,
    @Request() req: any,
  ) {
    if (req.user.role !== UserRole.FACULTY && req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Playback access is restricted to faculty');
    }
    return this.telemetryService.getDeltas(submissionId);
  }
}
