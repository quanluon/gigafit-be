import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobStatus as BullJobStatus } from 'bull';
import { WorkoutGenerationJobData } from './processors/workout-generation.processor';
import { MealGenerationJobData } from './processors/meal-generation.processor';
import { QueueName, JobName, JobStatus } from '../../common/enums';

interface JobStatusResponse {
  id: string;
  state: JobStatus;
  progress: number;
  result?: unknown;
  failedReason?: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QueueName.WORKOUT_GENERATION)
    private workoutGenerationQueue: Queue<WorkoutGenerationJobData>,
    @InjectQueue(QueueName.MEAL_GENERATION)
    private mealGenerationQueue: Queue<MealGenerationJobData>,
  ) {}

  /**
   * Add workout generation job to queue
   */
  async addWorkoutGenerationJob(
    data: WorkoutGenerationJobData,
  ): Promise<Job<WorkoutGenerationJobData>> {
    const job = await this.workoutGenerationQueue.add(JobName.GENERATE_WORKOUT_PLAN, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`Added workout generation job ${job.id} for user ${data.userId}`);
    return job;
  }

  /**
   * Add meal generation job to queue
   */
  async addMealGenerationJob(data: MealGenerationJobData): Promise<Job<MealGenerationJobData>> {
    const job = await this.mealGenerationQueue.add(JobName.GENERATE_MEAL_PLAN, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`Added meal generation job ${job.id} for user ${data.userId}`);
    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const job = await this.workoutGenerationQueue.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    const progress = await job.progress();

    return {
      id: job.id?.toString() || '',
      state: this.mapBullStatusToJobStatus(state),
      progress: typeof progress === 'number' ? progress : 0,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get meal job status
   */
  async getMealJobStatus(jobId: string): Promise<JobStatusResponse> {
    const job = await this.mealGenerationQueue.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    const progress = await job.progress();

    return {
      id: job.id?.toString() || '',
      state: this.mapBullStatusToJobStatus(state),
      progress: typeof progress === 'number' ? progress : 0,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get all jobs for a user (optional - for history)
   */
  async getUserJobs(userId: string, limit: number = 10): Promise<Job<WorkoutGenerationJobData>[]> {
    const jobStates: BullJobStatus[] = ['completed', 'failed', 'active', 'waiting'];
    const jobs = await this.workoutGenerationQueue.getJobs(jobStates);

    return jobs.filter((job) => job.data.userId === userId).slice(0, limit);
  }

  /**
   * Map Bull job status to our JobStatus enum
   */
  private mapBullStatusToJobStatus(bullStatus: BullJobStatus | 'stuck'): JobStatus {
    const statusMap: Record<string, JobStatus> = {
      waiting: JobStatus.WAITING,
      active: JobStatus.ACTIVE,
      completed: JobStatus.COMPLETED,
      failed: JobStatus.FAILED,
      delayed: JobStatus.DELAYED,
      paused: JobStatus.PAUSED,
      stuck: JobStatus.STUCK,
    };

    return statusMap[bullStatus] || JobStatus.WAITING;
  }
}
