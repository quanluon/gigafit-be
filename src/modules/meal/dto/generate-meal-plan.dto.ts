import { IsEnum, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { DayOfWeek } from 'src/common/enums';
import { Type } from 'class-transformer';

export class GenerateMealPlanDto {
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  scheduleDays?: DayOfWeek[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  useAI?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  fullWeek?: boolean;
}

