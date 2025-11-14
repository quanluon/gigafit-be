import { Injectable } from '@nestjs/common';
import { ExerciseRepository } from '../../repositories';
import { SearchExercisesDto } from './dto/search-exercises.dto';
import { Exercise } from '../../repositories/schemas/exercise.schema';

@Injectable()
export class ExerciseService {
  constructor(private readonly exerciseRepository: ExerciseRepository) {}

  searchExercises(query: SearchExercisesDto): Promise<Exercise[]> {
    return this.exerciseRepository.searchExercises({
      search: query.search,
      muscleGroup: query.muscleGroup,
      limit: query.limit,
    });
  }
}
