import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WorkoutService } from '../../workout/workout.service';
import { SubscriptionService } from '../../user/services/subscription.service';
import {
  Goal,
  ExperienceLevel,
  DayOfWeek,
  QueueName,
  JobName,
  JobProgress,
  GenerationType,
  JobConcurrency,
} from '../../../common/enums';
import { WorkoutPlan } from '../../../repositories';
import { NotificationFacade } from '../../notification/notification.facade';

export interface WorkoutGenerationJobData {
  userId: string;
  goal: Goal;
  experienceLevel: ExperienceLevel;
  scheduleDays: DayOfWeek[];
  height?: number;
  weight?: number;
  targetWeight?: number;
  useAI?: boolean;
  workoutTimeMinutes?: number;
  notes?: string;
}

interface WorkoutGenerationResult {
  planId: string;
  userId: string;
}
@Processor(QueueName.WORKOUT_GENERATION)
export class WorkoutGenerationProcessor {
  private readonly logger = new Logger(WorkoutGenerationProcessor.name);

  constructor(
    private readonly workoutService: WorkoutService,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationFacade: NotificationFacade,
  ) {}
  @Process({
    name: JobName.GENERATE_WORKOUT_PLAN,
    concurrency: JobConcurrency[QueueName.WORKOUT_GENERATION], // Process up to 3 jobs concurrently
  })
  async handleGeneratePlan(job: Job<WorkoutGenerationJobData>): Promise<WorkoutGenerationResult> {
    const {
      userId,
      goal,
      experienceLevel,
      scheduleDays,
      height,
      weight,
      targetWeight,
      workoutTimeMinutes,
      notes,
    } = job.data;

    this.logger.log(`Processing workout generation for user ${userId}, job ${job.id}`);

    try {
      await job.progress(JobProgress.STARTED);

      // Increment usage counter if AI was used
      await this.subscriptionService.incrementAIGenerationUsage(userId, GenerationType.WORKOUT);
      this.logger.log(`Incremented workout AI generation usage for user ${userId}`);

      // Generate workout plan (this is the slow part)
      const plan: WorkoutPlan = await this.workoutService.generatePlan(userId, {
        goal,
        experienceLevel,
        scheduleDays,
        height,
        weight,
        targetWeight,
        workoutTimeMinutes,
        notes,
      });

      await job.progress(JobProgress.FINALIZING);

      // Extract plan ID safely
      const planId = this.extractPlanId(plan);

      // Notify completion via FCM
      await job.progress(JobProgress.COMPLETED);
      await this.notificationFacade.notifyGenerationComplete({
        userId,
        jobId: job.id || 0,
        generationType: GenerationType.WORKOUT,
        planId,
      });

      this.logger.log(`Workout generation complete for user ${userId}, job ${job.id}`);

      return {
        planId,
        userId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate workout plan';
      this.logger.error(`Workout generation failed for user ${userId}:`, error);

      await this.subscriptionService.decrementAIGenerationUsage(userId, GenerationType.WORKOUT);

      await this.notificationFacade.notifyGenerationError({
        userId,
        jobId: job.id || 0,
        generationType: GenerationType.WORKOUT,
        error: errorMessage,
      });

      throw error; // Bull will mark job as failed
    }
  }
  /**
   * Safely extract plan ID from WorkoutPlan document
   */
  private extractPlanId(plan: WorkoutPlan): string {
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
