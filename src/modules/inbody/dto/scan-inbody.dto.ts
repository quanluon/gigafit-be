import { IsString, IsDateString, IsOptional } from 'class-validator';

export class ScanInbodyDto {
  @IsString()
  s3Url!: string;

  @IsString()
  originalFilename!: string;

  @IsDateString()
  @IsOptional()
  takenAt?: string;
}
