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
   * @param data Job data
   * @param priority Job priority (higher = more urgent, default: 0)
   */
  async addWorkoutGenerationJob(
    data: WorkoutGenerationJobData,
    priority = 0,
  ): Promise<Job<WorkoutGenerationJobData>> {
    const job = await this.workoutGenerationQueue.add(JobName.GENERATE_WORKOUT_PLAN, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: true,
      priority, // Higher priority jobs processed first
      jobId: `workout-${data.userId}-${Date.now()}`, // Unique job ID for deduplication
    });

    this.logger.log(
      `Added workout generation job ${job.id} for user ${data.userId} with priority ${priority}`,
    );
    return job;
  }
  /**
   * Add meal generation job to queue
   * @param data Job data
   * @param priority Job priority (higher = more urgent, default: 0)
   */
  async addMealGenerationJob(
    data: MealGenerationJobData,
    priority = 0,
  ): Promise<Job<MealGenerationJobData>> {
    const job = await this.mealGenerationQueue.add(JobName.GENERATE_MEAL_PLAN, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: true,
      priority,
      jobId: `meal-${data.userId}-${Date.now()}`,
    });

    this.logger.log(
      `Added meal generation job ${job.id} for user ${data.userId} with priority ${priority}`,
    );
    return job;
  }
  /**
   * Add InBody OCR/analysis job to queue
   * @param data Job data
   * @param priority Job priority (higher = more urgent, default: 0)
   */
  async addInbodyAnalysisJob(data: InbodyOcrJobData, priority = 0): Promise<Job<InbodyOcrJobData>> {
    const job = await this.inbodyOcrQueue.add(JobName.PROCESS_INBODY_REPORT, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: true,
      priority,
      jobId: `inbody-${data.userId}-${Date.now()}`,
    });

    this.logger.log(
      `Added InBody analysis job ${job.id} for user ${data.userId} with priority ${priority}`,
    );
    return job;
  }
  /**
   * Get job status (searches across all queues)
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    // Search across all queues in parallel
    const [workoutJob, mealJob, inbodyJob] = await Promise.all([
      this.workoutGenerationQueue.getJob(jobId),
      this.mealGenerationQueue.getJob(jobId),
      this.inbodyOcrQueue.getJob(jobId),
    ]);

    const job = workoutJob || mealJob || inbodyJob;

    if (!job) {
      throw new Error('Job not found');
    }

    // Get state and progress in parallel
    const [state, progress] = await Promise.all([job.getState(), job.progress()]);

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
   * Get all active jobs for a user across all queues (optimized with parallel queries)
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

    // Parallel fetch from all queues
    const [workoutJobs, mealJobs, inbodyJobs] = await Promise.all([
      this.workoutGenerationQueue.getJobs(activeStates),
      this.mealGenerationQueue.getJobs(activeStates),
      this.inbodyOcrQueue.getJobs(activeStates),
    ]);

    // Filter and process jobs in parallel
    const processJobs = async (
      jobs: Job[],
      type: QueueName,
    ): Promise<
      Array<{
        jobId: string;
        type: QueueName;
        status: JobStatus;
        progress: number;
        message?: string;
      }>
    > => {
      const userJobs = jobs.filter((job) => job.data?.userId === userId);

      // Process all jobs in parallel
      const jobPromises = userJobs.map(async (job) => {
        const [state, progress] = await Promise.all([job.getState(), job.progress()]);

        return {
          jobId: job.id?.toString() || '',
          type,
          status: this.mapBullStatusToJobStatus(state),
          progress: typeof progress === 'number' ? progress : 0,
          message: this.getProgressMessage(progress),
        };
      });

      return Promise.all(jobPromises);
    };

    // Process all queue types in parallel
    const [workoutResults, mealResults, inbodyResults] = await Promise.all([
      processJobs(workoutJobs, QueueName.WORKOUT_GENERATION),
      processJobs(mealJobs, QueueName.MEAL_GENERATION),
      processJobs(inbodyJobs, QueueName.INBODY_OCR),
    ]);

    return [...workoutResults, ...mealResults, ...inbodyResults];
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
