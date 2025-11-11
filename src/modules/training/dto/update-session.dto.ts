import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LogExerciseDto } from './log-exercise.dto';

export class UpdateSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LogExerciseDto)
  exercises!: LogExerciseDto[];
}
