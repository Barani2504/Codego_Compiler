import { IsString, IsNotEmpty, IsUUID, IsArray, ArrayMaxSize, IsOptional, MaxLength, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

const ALLOWED_LANGUAGES = ['python', 'javascript', 'java', 'cpp', 'c', 'r', 'html', 'css'];

export class TestCaseDto {
  @IsString()
  @MaxLength(4096)
  input: string;

  @IsString()
  @MaxLength(4096)
  expectedOutput: string;
}

export class SubmitCodeDto {
  @IsUUID('4')
  questionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(65536) // 64 KB hard cap on submitted code
  code: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsOptional()
  @IsNumber()
  timeTakenSeconds?: number;
}

export class RunCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(65536)
  code: string;

  @IsString()
  @IsNotEmpty()
  language: string;

  @IsArray()
  @ArrayMaxSize(3) // Only allow running against max 3 test cases
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases: TestCaseDto[];
}
