import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { MuscleGroup } from '../../../repositories/schemas/exercise.schema';
import { Type } from 'class-transformer';

export class SearchExercisesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MuscleGroup)
  muscleGroup?: MuscleGroup;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;
}
