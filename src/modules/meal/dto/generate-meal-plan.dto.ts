import { IsEnum, IsArray, IsOptional, IsBoolean, IsString, MaxLength } from 'class-validator';
import { DayOfWeek } from '../../../common/enums';
import { Type } from 'class-transformer';

export class GenerateMealPlanDto {
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  scheduleDays?: DayOfWeek[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  fullWeek?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
