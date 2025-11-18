import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../../../common/enums';

class TranslatableDto {
  @IsString()
  en!: string;

  @IsString()
  vi!: string;
}
export class ExerciseInputDto {
  @IsOptional()
  @IsString()
  exerciseId?: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => TranslatableDto)
  name!: TranslatableDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TranslatableDto)
  description?: TranslatableDto;

  @IsNumber()
  @Min(1)
  sets!: number;

  @IsString()
  reps!: string;

  @IsString()
  videoUrl!: string;
}
export class WorkoutDayInputDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ValidateNested()
  @Type(() => TranslatableDto)
  focus!: TranslatableDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExerciseInputDto)
  exercises!: ExerciseInputDto[];
}
export class CreateCustomPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WorkoutDayInputDto)
  schedule!: WorkoutDayInputDto[];
}
export class UpdateCustomPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutDayInputDto)
  schedule?: WorkoutDayInputDto[];
}
