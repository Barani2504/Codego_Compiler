import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ResultsService } from './results.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { UsersService } from '../users/users.service';

@Controller('api/results')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(
    private resultsService: ResultsService,
    private submissionsService: SubmissionsService,
    private usersService: UsersService,
  ) {}

  @Get(':submissionId/download')
  async downloadResult(
    @Param('submissionId') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const submission = await this.submissionsService.getSubmissionById(id);
    const isFacultyOrAdmin =
      req.user.role === 'faculty' || req.user.role === 'admin';
    if (
      !submission ||
      (!isFacultyOrAdmin && submission.userId !== req.user.sub)
    ) {
      return res.status(404).json({ message: 'Result not found' });
    }
    // Always use the submission owner's details on the PDF, not the requester's
    const student = await this.usersService.findById(submission.userId);
    const pdfBuffer = await this.resultsService.generatePDF(
      submission,
      student?.name || 'Student',
      student?.regNumber || '',
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="result-${submission.language}-${submission.difficulty}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }
}
