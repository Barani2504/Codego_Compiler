import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuestionsService } from './questions.service';
import { GenerateQuestionDto } from './dto/generate-question.dto';

import { IsOptional, IsInt, Min, Max } from 'class-validator';

export class PrewarmDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

@Controller('api/questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Post('generate')
  async generate(@Body() body: GenerateQuestionDto) {
    const question = await this.questionsService.generateQuestion(body.language, body.difficulty);
    // Only expose the first 2 test cases to the student — the rest are hidden and used only for final grading.
    const publicTestCases = Array.isArray(question.testCases) ? question.testCases.slice(0, 2) : [];
    const publicQuestion = { ...question, testCases: publicTestCases };
    return publicQuestion;
  }

  @Post('prewarm')
  async prewarm(@Body() body: PrewarmDto) {
    return this.questionsService.prewarmCache(body?.limit ?? 100);
  }
}

