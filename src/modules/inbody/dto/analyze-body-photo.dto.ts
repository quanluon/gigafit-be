import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeBodyPhotoDto {
  @ApiProperty({ description: 'S3 URL of the uploaded body photo' })
  @IsString()
  s3Url!: string;

  @ApiProperty({ description: 'Original filename of the photo' })
  @IsString()
  originalFilename!: string;

  @ApiProperty({ description: 'Date when the photo was taken', required: false })
  @IsOptional()
  @IsDateString()
  takenAt?: string;
}
