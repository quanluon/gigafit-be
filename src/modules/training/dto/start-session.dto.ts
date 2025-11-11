import { IsEnum, IsString } from 'class-validator';
import { DayOfWeek } from '@common/enums';

export class StartSessionDto {
  @IsString()
  planId!: string;

  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;
}

