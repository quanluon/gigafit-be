import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MealService } from '../../meal/meal.service';
import { SubscriptionService } from '../../user/services/subscription.service';
import {
  DayOfWeek,
  QueueName,
  JobName,
  JobProgress,
  GenerationType,
} from '../../../common/enums';
import { MealPlan } from '../../../repositories';
import { NotificationFacade } from '../../notification/notification.facade';

export interface MealGenerationJobData {
  userId: string;
  scheduleDays?: DayOfWeek[];
  fullWeek?: boolean;
  notes?: string;
}

interface MealGenerationResult {
  planId: string;
  userId: string;
}
@Processor(QueueName.MEAL_GENERATION)
export class MealGenerationProcessor {
  private readonly logger = new Logger(MealGenerationProcessor.name);

  constructor(
    private readonly mealService: MealService,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationFacade: NotificationFacade,
  ) {}
  @Process(JobName.GENERATE_MEAL_PLAN)
  async handleGeneratePlan(job: Job<MealGenerationJobData>): Promise<MealGenerationResult> {
    const { userId, notes } = job.data;

    this.logger.log(`Processing meal plan generation for user ${userId}, job ${job.id}`);

    try {
      await job.progress(JobProgress.STARTED);
      // Increment usage counter if AI was used
      await this.subscriptionService.incrementAIGenerationUsage(userId, GenerationType.MEAL);
      this.logger.log(`Incremented meal AI generation usage for user ${userId}`);

      // Generate meal plan (this is the slow part)
      const plan: MealPlan = await this.mealService.generateMealPlan(userId, notes);

      await job.progress(JobProgress.FINALIZING);

      // Extract plan ID safely
      const planId = this.extractPlanId(plan);

      await job.progress(JobProgress.COMPLETED);
      await this.notificationFacade.notifyGenerationComplete({
        userId,
        jobId: job.id || 0,
        generationType: GenerationType.MEAL,
        planId,
      });

      this.logger.log(`Meal plan generation complete for user ${userId}, job ${job.id}`);

      return {
        planId,
        userId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate meal plan';
      this.logger.error(`Meal plan generation failed for user ${userId}:`, error);

      await this.notificationFacade.notifyGenerationError({
        userId,
        jobId: job.id || 0,
        generationType: GenerationType.MEAL,
        error: errorMessage,
      });

      throw error; // Bull will mark job as failed
    }
  }
  /**
   * Safely extract plan ID from MealPlan document
   */
  private extractPlanId(plan: MealPlan): string {
    if ('_id' in plan && plan._id) {
      if (typeof plan._id === 'string') {
        return plan._id;
      }
      if (typeof plan._id === 'object' && 'toString' in plan._id) {
        return (plan._id as { toString: () => string }).toString();
      }
    }
    return '';
  }
}
