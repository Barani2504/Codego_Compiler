import { IsString, IsIn } from 'class-validator';

const ALLOWED_LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'c', 'r', 'html', 'css'];
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];

export class GenerateQuestionDto {
  @IsString()
  @IsIn(ALLOWED_LANGUAGES, {
    message: `language must be one of: ${ALLOWED_LANGUAGES.join(', ')}`,
  })
  language: string;

  @IsString()
  @IsIn(ALLOWED_DIFFICULTIES, {
    message: `difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(', ')}`,
  })
  difficulty: string;
}
