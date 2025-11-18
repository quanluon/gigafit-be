import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FeedbackContext } from '../../../common/enums';

export class CreateFeedbackDto {
  @ApiProperty({ example: 'Loving the new workout planner flow!' })
  @IsString()
  @MinLength(10)
  @MaxLength(1200)
  message!: string;

  @ApiProperty({ example: 'you@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: FeedbackContext, example: FeedbackContext.WORKOUT })
  @IsEnum(FeedbackContext)
  context!: FeedbackContext;

  @ApiProperty({ example: 'user_123', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: '/planner', required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ example: 'vi', required: false })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiProperty({ example: '1.2.3', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;
}
