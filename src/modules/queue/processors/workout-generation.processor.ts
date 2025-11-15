import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WorkoutService } from '../../workout/workout.service';
import { NotificationGateway } from '../../notification/notification.gateway';
import { SubscriptionService } from '../../user/services/subscription.service';
import {
  Goal,
  ExperienceLevel,
  DayOfWeek,
  QueueName,
  JobName,
  JobProgress,
  WebSocketEvent,
  GenerationType,
} from '../../../common/enums';
import { WorkoutPlan } from '../../../repositories';

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
    private readonly notificationGateway: NotificationGateway,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Process(JobName.GENERATE_WORKOUT_PLAN)
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
      // Notify start
      await job.progress(JobProgress.STARTED);
      this.notificationGateway.sendToUser(userId, WebSocketEvent.WORKOUT_GENERATION_STARTED, {
        jobId: job.id || 0,
        progress: JobProgress.STARTED,
        message: 'Starting workout plan generation...',
      });

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

      // Update progress: Finalizing
      await job.progress(JobProgress.FINALIZING);
      this.notificationGateway.sendToUser(userId, WebSocketEvent.WORKOUT_GENERATION_PROGRESS, {
        jobId: job.id || 0,
        progress: JobProgress.FINALIZING,
        message: 'Finalizing workout plan...',
      });

      // Extract plan ID safely
      const planId = this.extractPlanId(plan);

      // Notify completion
      await job.progress(JobProgress.COMPLETED);
      this.notificationGateway.sendToUser(userId, WebSocketEvent.WORKOUT_GENERATION_COMPLETE, {
        jobId: job.id || 0,
        planId,
        message: 'Your workout plan is ready!',
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

      // Notify error
      this.notificationGateway.sendToUser(userId, WebSocketEvent.WORKOUT_GENERATION_ERROR, {
        jobId: job.id || 0,
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
