import {
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Translatable } from '../../../common/interfaces';

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

  @IsObject()
  name!: Translatable; // Exercise name (en/vi)

  @IsOptional()
  @IsObject()
  description?: Translatable; // Exercise description (en/vi)

  @IsOptional()
  @IsString()
  muscleGroup?: string; // Primary muscle group

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseSetDto)
  sets!: ExerciseSetDto[];

  @IsOptional()
  @IsString()
  notes?: string; // User notes

  @IsOptional()
  @IsString()
  videoUrl?: string; // Reference video
}

export class LogExerciseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseLogDto)
  exercises!: ExerciseLogDto[];
}
