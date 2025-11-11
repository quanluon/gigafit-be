import { DayOfWeek, ExperienceLevel, Goal } from '@/common/enums';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional } from 'class-validator';

export class GeneratePlanDto {
  @IsEnum(Goal)
  goal!: Goal;

  @IsEnum(ExperienceLevel)
  experienceLevel!: ExperienceLevel;

  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  scheduleDays!: DayOfWeek[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  height?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  targetWeight?: number;
}
