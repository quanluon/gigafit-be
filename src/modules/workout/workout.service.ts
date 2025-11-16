import { Injectable, NotFoundException } from '@nestjs/common';
import {
  WorkoutRepository,
  WorkoutPlan,
  WorkoutDay,
  ExerciseRepository,
  InbodyResultRepository,
} from '../../repositories';
import { DayOfWeek, PlanSource } from '../../common/enums';
import { InbodyAnalysis } from '../../common/interfaces';
import { AIService } from '../ai/ai.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import {
  CreateCustomPlanDto,
  WorkoutDayInputDto,
  UpdateCustomPlanDto,
} from './dto/custom-plan.dto';
import { Exercise as WorkoutExercise } from '../../repositories/schemas/workout-plan.schema';
import { Exercise as CatalogExercise } from '../../repositories/schemas/exercise.schema';

@Injectable()
export class WorkoutService {
  constructor(
    private readonly workoutRepository: WorkoutRepository,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly aiService: AIService,
    private readonly inbodyResultRepository: InbodyResultRepository,
  ) {}

  async generatePlan(userId: string, generatePlanDto: GeneratePlanDto): Promise<WorkoutPlan> {
    // Generate plan using AI
    const latestInbody = await this.inbodyResultRepository.findLatestCompleted(userId);
    const generatedPlan = await this.aiService.generateWorkoutPlan({
      ...generatePlanDto,
      inbodySummary: ((): string | undefined => {
        if (!latestInbody?.aiAnalysis) return undefined;
        const analysis = latestInbody.aiAnalysis;
        // Old format: Translatable (en/vi are strings)
        if (
          typeof analysis === 'object' &&
          analysis !== null &&
          'en' in analysis &&
          'vi' in analysis &&
          typeof (analysis as { en: unknown }).en === 'string' &&
          typeof (analysis as { vi: unknown }).vi === 'string'
        ) {
          const translatable = analysis as { en: string; vi: string };
          return translatable.en || translatable.vi;
        }
        // New format: Structured object (InbodyAnalysis)
        if (
          typeof analysis === 'object' &&
          analysis !== null &&
          'en' in analysis &&
          'vi' in analysis &&
          typeof (analysis as { en: unknown }).en === 'object' &&
          (analysis as { en: unknown }).en !== null &&
          'body_composition_summary' in ((analysis as { en: unknown }).en as object)
        ) {
          const structured = analysis as InbodyAnalysis;
          return structured.en.body_composition_summary || structured.vi.body_composition_summary;
        }
        return undefined;
      })(),
      inbodyMetrics: latestInbody?.metrics,
    });

    // Get current week and year
    const now = new Date();
    const week = this.getWeekNumber(now);
    const year = now.getFullYear();

    // Check if plan already exists for this week
    const existingPlan = await this.workoutRepository.findByUserAndWeek(userId, week, year);
    if (existingPlan) {
      // Update existing plan
      const updatedPlan = await this.workoutRepository.update(existingPlan._id!.toString(), {
        schedule: generatedPlan.schedule,
        source: PlanSource.AI,
        title: 'Personalized Plan',
      });
      if (!updatedPlan) {
        throw new NotFoundException('Failed to update workout plan');
      }
      return updatedPlan;
    }

    // Create new plan
    return this.workoutRepository.create({
      userId,
      week,
      year,
      source: PlanSource.AI,
      title: 'Personalized Plan',
      schedule: generatedPlan.schedule,
    });
  }

  async getCurrentPlan(userId: string): Promise<WorkoutPlan> {
    const plan = await this.workoutRepository.findCurrentWeekPlan(userId);
    if (!plan) {
      throw new NotFoundException('No workout plan found for current week');
    }
    return plan;
  }

  async getPlanByWeek(userId: string, week: number, year: number): Promise<WorkoutPlan> {
    const plan = await this.workoutRepository.findByUserAndWeek(userId, week, year);
    if (!plan) {
      throw new NotFoundException('Workout plan not found');
    }
    return plan;
  }

  async getWorkoutByDay(userId: string, day: DayOfWeek): Promise<WorkoutDay | null> {
    const plan = await this.workoutRepository.findCurrentWeekPlan(userId);
    if (!plan) {
      return null;
    }

    const workout = plan.schedule.find((w) => w.dayOfWeek === day);
    return workout || null;
  }

  async updatePlan(
    userId: string,
    planId: string,
    updateData: UpdateCustomPlanDto,
  ): Promise<WorkoutPlan> {
    const plan = await this.workoutRepository.findById(planId);
    if (!plan || plan.userId !== userId) {
      throw new NotFoundException('Workout plan not found');
    }

    const updatePayload: Partial<WorkoutPlan> = {};

    if (updateData.title !== undefined) {
      updatePayload.title = updateData.title;
    }

    if (updateData.schedule) {
      updatePayload.schedule = await this.normalizeSchedule(updateData.schedule);
    }

    if (updateData.schedule && plan.source !== PlanSource.CUSTOM) {
      updatePayload.source = PlanSource.CUSTOM;
    }

    const updatedPlan = await this.workoutRepository.update(planId, updatePayload);
    if (!updatedPlan) {
      throw new NotFoundException('Failed to update workout plan');
    }
    return updatedPlan;
  }

  async deletePlan(userId: string, planId: string): Promise<boolean> {
    const plan = await this.workoutRepository.findById(planId);
    if (!plan || plan.userId !== userId) {
      throw new NotFoundException('Workout plan not found');
    }

    return this.workoutRepository.delete(planId);
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  async createCustomPlan(userId: string, planData: CreateCustomPlanDto): Promise<WorkoutPlan> {
    const now = new Date();
    const week = this.getWeekNumber(now);
    const year = now.getFullYear();

    const normalizedSchedule = await this.normalizeSchedule(planData.schedule);

    const basePayload: Partial<WorkoutPlan> = {
      title: planData.title ?? 'Custom Plan',
      source: PlanSource.CUSTOM,
      schedule: normalizedSchedule,
    };

    // Check if plan already exists for this week
    const existingPlan = await this.workoutRepository.findByUserAndWeek(userId, week, year);
    if (existingPlan) {
      const updatedPlan = await this.workoutRepository.update(existingPlan._id!.toString(), {
        ...basePayload,
      });
      if (!updatedPlan) {
        throw new NotFoundException('Failed to update workout plan');
      }
      return updatedPlan;
    }

    // Create new custom plan
    return this.workoutRepository.create({
      userId,
      week,
      year,
      ...basePayload,
    } as WorkoutPlan);
  }

  private async normalizeSchedule(schedule: WorkoutDayInputDto[]): Promise<WorkoutDay[]> {
    const mappedSchedule: WorkoutDay[] = schedule.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      focus: day.focus,
      exercises: day.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        description: exercise.description ?? { en: '', vi: '' },
        sets: exercise.sets,
        reps: exercise.reps,
        videoUrl: exercise.videoUrl,
      })),
    }));

    return this.hydrateExercises(mappedSchedule);
  }

  private async hydrateExercises(schedule: WorkoutDay[]): Promise<WorkoutDay[]> {
    const exerciseIds = schedule
      .flatMap((day) => day.exercises)
      .map((exercise) => exercise.exerciseId)
      .filter((id): id is string => Boolean(id));

    const uniqueIds = Array.from(new Set(exerciseIds));
    const exerciseMap = await this.exerciseRepository.findByIds(uniqueIds);

    return schedule.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) => {
        if (!exercise.exerciseId) {
          return this.ensureDescription(exercise);
        }
        const catalogExercise = exerciseMap.get(exercise.exerciseId);
        if (!catalogExercise) {
          return this.ensureDescription(exercise);
        }
        return this.mergeExerciseData(exercise, catalogExercise);
      }),
    }));
  }

  private ensureDescription(exercise: WorkoutExercise): WorkoutExercise {
    return {
      ...exercise,
      description: exercise.description ?? { en: '', vi: '' },
    };
  }

  private mergeExerciseData(
    exercise: WorkoutExercise,
    catalogExercise: CatalogExercise,
  ): WorkoutExercise {
    const fallbackDescription = catalogExercise.metadata?.description ?? '';
    const hasCustomDescription =
      exercise.description && (exercise.description.en || exercise.description.vi);

    return {
      ...exercise,
      name: exercise.name ?? catalogExercise.name,
      description: hasCustomDescription
        ? exercise.description
        : {
            en: fallbackDescription,
            vi: fallbackDescription,
          },
      videoUrl: exercise.videoUrl || catalogExercise.videoUrl,
    };
  }
}
