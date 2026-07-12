import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FacultyGuard } from '../common/guards/faculty.guard';
import { FacultyService } from './faculty.service';

@Controller('api/faculty')
@UseGuards(JwtAuthGuard, FacultyGuard)
export class FacultyController {
  constructor(private facultyService: FacultyService) {}

  @Get('results')
  async getResults(@Query() filters: any) {
    return this.facultyService.getAllResults(filters);
  }

  @Get('stats')
  async getStats() {
    return this.facultyService.getSummaryStats();
  }

  @Get('export-csv')
  async exportCSV(@Query() filters: any, @Res() res: Response) {
    const csv = await this.facultyService.exportCSV(filters);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="assessment-results.csv"',
    });
    res.send(csv);
  }
}
