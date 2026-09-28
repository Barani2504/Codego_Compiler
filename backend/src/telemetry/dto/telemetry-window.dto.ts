import {
  IsInt, IsObject, IsNotEmpty, IsNumber, ValidateNested, IsArray,
  ArrayMaxSize, Min, IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

class FeatureVectorDto {
  @IsNumber() meanInterKeyMs: number;
  @IsNumber() stdDevInterKeyMs: number;
  @IsInt() @Min(0) pastedCharCount: number;
  @IsInt() @Min(0) typedCharCount: number;
  @IsInt() @Min(0) maxSingleInsertionLength: number;
  @IsInt() @Min(0) burstCount: number;
}

export class TelemetryWindowDto {
  @IsInt() @Min(0)
  windowIndex: number;

  @IsObject()
  @ValidateNested()
  @Type(() => FeatureVectorDto)
  featureVector: FeatureVectorDto;
}

class DeltaRangeDto {
  @IsInt() startLineNumber: number;
  @IsInt() startColumn: number;
  @IsInt() endLineNumber: number;
  @IsInt() endColumn: number;
}

class DeltaItemDto {
  @IsInt() sequenceNum: number;
  @IsObject() @ValidateNested() @Type(() => DeltaRangeDto)
  range: DeltaRangeDto;
  @IsNotEmpty() text: string;
  @IsInt() rangeLength: number;
  @IsInt() @Min(0) timestampMs: number;
}

export class CodeDeltaBatchDto {
  @IsArray()
  @ArrayMaxSize(200) // prevent oversized batches
  @ValidateNested({ each: true })
  @Type(() => DeltaItemDto)
  deltas: DeltaItemDto[];
}
