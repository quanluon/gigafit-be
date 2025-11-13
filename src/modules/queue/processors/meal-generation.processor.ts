import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MealService } from '../../meal/meal.service';
import { NotificationGateway } from '../../notification/notification.gateway';
import { SubscriptionService } from '../../user/services/subscription.service';
import {
  DayOfWeek,
  QueueName,
  JobName,
  JobProgress,
  WebSocketEvent,
  GenerationType,
} from '../../../common/enums';
import { MealPlan } from '../../../repositories';

export interface MealGenerationJobData {
  userId: string;
  scheduleDays?: DayOfWeek[];
  useAI?: boolean;
  fullWeek?: boolean;
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
    private readonly notificationGateway: NotificationGateway,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Process(JobName.GENERATE_MEAL_PLAN)
  async handleGeneratePlan(job: Job<MealGenerationJobData>): Promise<MealGenerationResult> {
    const { userId, scheduleDays, useAI, fullWeek } = job.data;

    this.logger.log(`Processing meal plan generation for user ${userId}, job ${job.id}`);

    try {
      // Notify start
      await job.progress(JobProgress.STARTED);
      this.notificationGateway.sendToUser(userId, WebSocketEvent.MEAL_GENERATION_STARTED, {
        jobId: job.id || 0,
        progress: JobProgress.STARTED,
        message: 'Starting meal plan generation...',
      });

      // Generate meal plan (this is the slow part)
      const plan: MealPlan = await this.mealService.generateMealPlan(
        userId,
        scheduleDays,
        useAI,
        fullWeek,
      );

      // Update progress: Finalizing
      await job.progress(JobProgress.FINALIZING);
      this.notificationGateway.sendToUser(userId, WebSocketEvent.MEAL_GENERATION_PROGRESS, {
        jobId: job.id || 0,
        progress: JobProgress.FINALIZING,
        message: 'Finalizing meal plan...',
      });

      // Extract plan ID safely
      const planId = this.extractPlanId(plan);

      // Increment usage counter if AI was used
      if (useAI) {
        await this.subscriptionService.incrementAIGenerationUsage(userId, GenerationType.MEAL);
        this.logger.log(`Incremented meal AI generation usage for user ${userId}`);
      }

      // Notify completion
      await job.progress(JobProgress.COMPLETED);
      this.notificationGateway.sendToUser(userId, WebSocketEvent.MEAL_GENERATION_COMPLETE, {
        jobId: job.id || 0,
        planId,
        message: 'Your meal plan is ready!',
      });

      this.logger.log(`Meal plan generation complete for user ${userId}, job ${job.id}`);

      return {
        planId,
        userId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate meal plan';
      this.logger.error(`Meal plan generation failed for user ${userId}:`, error);

      // Notify error
      this.notificationGateway.sendToUser(userId, WebSocketEvent.MEAL_GENERATION_ERROR, {
        jobId: job.id || 0,
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
