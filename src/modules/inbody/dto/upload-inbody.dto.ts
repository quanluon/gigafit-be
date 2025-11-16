import { IsDateString, IsOptional } from 'class-validator';

export class UploadInbodyDto {
  @IsOptional()
  @IsDateString()
  takenAt?: string;
}
