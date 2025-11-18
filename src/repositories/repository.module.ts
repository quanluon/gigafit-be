import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AwardRepository } from './award.repository';
import { ExerciseRepository } from './exercise.repository';
import { InbodyResultRepository } from './inbody-result.repository';
import { MealPlanRepository } from './meal-plan.repository';
import { Award, AwardSchema } from './schemas/award.schema';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import { InbodyResult, InbodyResultSchema } from './schemas/inbody-result.schema';
import { MealPlan, MealPlanSchema } from './schemas/meal-plan.schema';
import { TrainingSession, TrainingSessionSchema } from './schemas/training-session.schema';
import { User, UserSchema } from './schemas/user.schema';
import { WeightLog, WeightLogSchema } from './schemas/weight-log.schema';
import { WorkoutPlan, WorkoutPlanSchema } from './schemas/workout-plan.schema';
import { TrainingSessionRepository } from './training-session.repository';
import { UserRepository } from './user.repository';
import { WeightLogRepository } from './weight-log.repository';
import { WorkoutRepository } from './workout.repository';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema';
import { FeedbackRepository } from './feedback.repository';
import { DeviceToken, DeviceTokenSchema } from './schemas/device-token.schema';
import { DeviceTokenRepository } from './device-token.repository';

const schemas = [
  { name: User.name, schema: UserSchema },
  { name: WorkoutPlan.name, schema: WorkoutPlanSchema },
  { name: TrainingSession.name, schema: TrainingSessionSchema },
  { name: Award.name, schema: AwardSchema },
  { name: WeightLog.name, schema: WeightLogSchema },
  { name: MealPlan.name, schema: MealPlanSchema },
  { name: Exercise.name, schema: ExerciseSchema },
  { name: InbodyResult.name, schema: InbodyResultSchema },
  { name: Feedback.name, schema: FeedbackSchema },
  { name: DeviceToken.name, schema: DeviceTokenSchema },
];

const repositories = [
  UserRepository,
  WorkoutRepository,
  TrainingSessionRepository,
  AwardRepository,
  WeightLogRepository,
  MealPlanRepository,
  ExerciseRepository,
  InbodyResultRepository,
  FeedbackRepository,
  DeviceTokenRepository,
];

@Global()
@Module({
  imports: [MongooseModule.forFeature(schemas)],
  providers: repositories,
  exports: repositories,
})
export class RepositoryModule {}
