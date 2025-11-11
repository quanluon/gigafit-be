import { IsEmail, IsString, IsEnum, IsNumber, IsArray, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Goal, ExperienceLevel, DayOfWeek, ActivityLevel, Gender } from '@common/enums';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  cognitoSub!: string;

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
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  scheduleDays?: DayOfWeek[];
}
