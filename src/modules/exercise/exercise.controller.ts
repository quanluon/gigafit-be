import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExerciseService } from './exercise.service';
import { SearchExercisesDto } from './dto/search-exercises.dto';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { Exercise } from '../../repositories/schemas/exercise.schema';

@ApiTags('exercise')
@Controller('exercises')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExerciseController extends BaseController {
  constructor(private readonly exerciseService: ExerciseService) {
    super();
  }
  @Get()
  @ApiOperation({ summary: 'Search exercises catalog' })
  async searchExercises(@Query() query: SearchExercisesDto): Promise<ApiResponseType<Exercise[]>> {
    const exercises = await this.exerciseService.searchExercises(query);
    return this.success(exercises);
  }
}
