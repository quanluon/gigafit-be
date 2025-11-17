import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job, JobStatus as BullJobStatus } from 'bull';
import { WorkoutGenerationJobData } from './processors/workout-generation.processor';
import { MealGenerationJobData } from './processors/meal-generation.processor';
import { InbodyOcrJobData } from './processors/inbody-ocr.processor';
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
    @InjectQueue(QueueName.INBODY_OCR)
    private inbodyOcrQueue: Queue<InbodyOcrJobData>,
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
   * Add InBody OCR/analysis job to queue
   */
  async addInbodyAnalysisJob(data: InbodyOcrJobData): Promise<Job<InbodyOcrJobData>> {
    const job = await this.inbodyOcrQueue.add(JobName.PROCESS_INBODY_REPORT, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`Added InBody analysis job ${job.id} for user ${data.userId}`);
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
   * Get all active jobs for a user across all queues
   */
  async getUserActiveJobs(userId: string): Promise<
    Array<{
      jobId: string;
      type: QueueName;
      status: JobStatus;
      progress: number;
      message?: string;
    }>
  > {
    const activeStates: BullJobStatus[] = ['active', 'waiting', 'delayed'];
    const result: Array<{
      jobId: string;
      type: QueueName;
      status: JobStatus;
      progress: number;
      message?: string;
    }> = [];

    // Get active workout jobs
    const workoutJobs = await this.workoutGenerationQueue.getJobs(activeStates);
    for (const job of workoutJobs) {
      if (job.data.userId === userId) {
        const state = await job.getState();
        const progress = await job.progress();

        result.push({
          jobId: job.id?.toString() || '',
          type: QueueName.WORKOUT_GENERATION,
          status: this.mapBullStatusToJobStatus(state),
          progress: typeof progress === 'number' ? progress : 0,
          message: this.getProgressMessage(progress),
        });
      }
    }

    // Get active meal jobs
    const mealJobs = await this.mealGenerationQueue.getJobs(activeStates);
    // Get active InBody jobs
    const inbodyJobs = await this.inbodyOcrQueue.getJobs(activeStates);
    for (const job of inbodyJobs) {
      if (job.data.userId === userId) {
        const state = await job.getState();
        const progress = await job.progress();

        result.push({
          jobId: job.id?.toString() || '',
          type: QueueName.INBODY_OCR,
          status: this.mapBullStatusToJobStatus(state),
          progress: typeof progress === 'number' ? progress : 0,
          message: this.getProgressMessage(progress),
        });
      }
    }
    for (const job of mealJobs) {
      if (job.data.userId === userId) {
        const state = await job.getState();
        const progress = await job.progress();

        result.push({
          jobId: job.id?.toString() || '',
          type: QueueName.MEAL_GENERATION,
          status: this.mapBullStatusToJobStatus(state),
          progress: typeof progress === 'number' ? progress : 0,
          message: this.getProgressMessage(progress),
        });
      }
    }

    return result;
  }

  /**
   * Get progress message based on progress value
   */
  private getProgressMessage(progress: number | Record<string, unknown>): string {
    const progressNum = typeof progress === 'number' ? progress : 0;

    if (progressNum >= 90) return 'Finalizing plan...';
    if (progressNum >= 50) return 'Generating exercises...';
    if (progressNum >= 10) return 'Analyzing your profile...';
    return 'Starting generation...';
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
