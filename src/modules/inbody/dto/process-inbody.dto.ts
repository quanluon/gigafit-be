import { IsString, IsDateString, IsOptional, IsObject } from 'class-validator';
import { InbodyMetricsSummary } from '../../../common/interfaces';

export class ProcessInbodyDto {
  @IsString()
  s3Url!: string;

  @IsString()
  originalFilename!: string;

  @IsString()
  ocrText!: string;

  @IsObject()
  @IsOptional()
  metrics?: InbodyMetricsSummary;

  @IsDateString()
  @IsOptional()
  takenAt?: string;
}
