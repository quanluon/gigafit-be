import { IsString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExerciseSetDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reps!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weight!: number;
}

export class ExerciseLogDto {
  @IsString()
  exerciseId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseSetDto)
  sets!: ExerciseSetDto[];
}

export class LogExerciseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseLogDto)
  exercises!: ExerciseLogDto[];
}
