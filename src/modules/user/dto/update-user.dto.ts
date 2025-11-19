import { IsEnum, IsNumber, IsArray, IsOptional, Min } from 'class-validator';
import {
  Goal,
  ExperienceLevel,
  DayOfWeek,
  ActivityLevel,
  Gender,
  TrainingEnvironment,
} from '../../../common/enums';
import { Type } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(Goal)
  goal?: Goal;

  @IsOptional()
  @IsEnum(ExperienceLevel)
  experienceLevel?: ExperienceLevel;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  targetWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  age?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;

  @IsOptional()
  @IsEnum(TrainingEnvironment)
  trainingEnvironment?: TrainingEnvironment;

  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  scheduleDays?: DayOfWeek[];
}
