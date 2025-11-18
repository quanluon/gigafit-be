import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ExerciseLoggedEvent } from '../events/exercise-logged.event';
import { AnalyticsService } from '../analytics.service';
import { EventName } from '../../../common/enums';
import { AwardType } from 'src/repositories';

@Injectable()
export class AwardListener {
  private readonly logger = new Logger(AwardListener.name);

  constructor(private readonly analyticsService: AnalyticsService) {}
  @OnEvent(EventName.EXERCISE_LOGGED)
  async handleExerciseLogged(event: ExerciseLoggedEvent): Promise<void> {
    try {
      this.logger.log(`Processing awards for user ${event.userId}`);

      for (const exercise of event.exercises) {
        // Find max weight in this exercise's sets
        const maxWeight = Math.max(...exercise.sets.map((s) => s.weight));

        if (maxWeight > 0) {
          // Use exercise name (prefer en, fallback to vi) for PR check
          const exerciseName = exercise.name?.en || exercise.name?.vi || exercise.exerciseId;
          // Check if this is a new PR
          const isNewPR = await this.analyticsService.checkIfNewPR(
            event.userId,
            exerciseName,
            maxWeight,
          );

          if (isNewPR) {
            // Create award for new PR
            await this.analyticsService.createAward(
              event.userId,
              exercise.name.en,
              maxWeight,
              AwardType.PR,
            );
            this.logger.log(
              `Created PR award for user ${event.userId}, exercise ${exercise.name.en}, weight ${maxWeight}kg`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process awards for user ${event.userId}:`, error);
    }
  }
}
