import { Module, forwardRef } from '@nestjs/common';
import { WorkoutController } from './workout.controller';
import { WorkoutService } from './workout.service';
import { AIModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AIModule, forwardRef(() => QueueModule)],
  controllers: [WorkoutController],
  providers: [WorkoutService],
  exports: [WorkoutService],
})
export class WorkoutModule {}
