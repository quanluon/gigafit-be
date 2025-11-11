import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LogWeightDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  weight!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
