import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { WorkoutPlan, WorkoutPlanSchema } from './schemas/workout-plan.schema';
import { TrainingSession, TrainingSessionSchema } from './schemas/training-session.schema';
import { Award, AwardSchema } from './schemas/award.schema';
import { WeightLog, WeightLogSchema } from './schemas/weight-log.schema';
import { MealPlan, MealPlanSchema } from './schemas/meal-plan.schema';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import { UserRepository } from './user.repository';
import { WorkoutRepository } from './workout.repository';
import { TrainingSessionRepository } from './training-session.repository';
import { AwardRepository } from './award.repository';
import { WeightLogRepository } from './weight-log.repository';
import { MealPlanRepository } from './meal-plan.repository';
import { ExerciseRepository } from './exercise.repository';

const schemas = [
  { name: User.name, schema: UserSchema },
  { name: WorkoutPlan.name, schema: WorkoutPlanSchema },
  { name: TrainingSession.name, schema: TrainingSessionSchema },
  { name: Award.name, schema: AwardSchema },
  { name: WeightLog.name, schema: WeightLogSchema },
  { name: MealPlan.name, schema: MealPlanSchema },
  { name: Exercise.name, schema: ExerciseSchema },
];

const repositories = [
  UserRepository,
  WorkoutRepository,
  TrainingSessionRepository,
  AwardRepository,
  WeightLogRepository,
  MealPlanRepository,
  ExerciseRepository,
];

@Global()
@Module({
  imports: [MongooseModule.forFeature(schemas)],
  providers: repositories,
  exports: repositories,
})
export class RepositoryModule {}
