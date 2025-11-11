import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MuscleGroup } from '../../../repositories/schemas/exercise.schema';

export class CrawlAllDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  videosPerGroup?: number = 5;
}

export class CrawlMuscleGroupDto {
  @IsEnum(MuscleGroup)
  muscleGroup!: MuscleGroup;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  videosPerSource?: number = 5;
}
