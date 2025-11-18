import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GenerationType } from '../../../common/enums';

export enum TestNotificationCategory {
  COMPLETE = 'complete',
  ERROR = 'error',
}

export class SendTestNotificationDto {
  @IsEnum(GenerationType)
  generationType!: GenerationType;

  @IsEnum(TestNotificationCategory)
  @IsOptional()
  category?: TestNotificationCategory;

  @IsString()
  @IsOptional()
  planId?: string;

  @IsString()
  @IsOptional()
  resultId?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;
}
