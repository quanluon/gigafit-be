import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkoutRepository, WorkoutPlan, WorkoutDay } from '@/repositories';
import { DayOfWeek } from 'src/common/enums';
import { AIService } from '../ai/ai.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';

@Injectable()
export class WorkoutService {
  constructor(
    private readonly workoutRepository: WorkoutRepository,
    private readonly aiService: AIService,
  ) {}

  async generatePlan(userId: string, generatePlanDto: GeneratePlanDto): Promise<WorkoutPlan> {
    // Generate plan using AI
    const generatedPlan = await this.aiService.generateWorkoutPlan(generatePlanDto);

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

  async updatePlan(userId: string, planId: string, schedule: WorkoutDay[]): Promise<WorkoutPlan> {
    const plan = await this.workoutRepository.findById(planId);
    if (!plan || plan.userId !== userId) {
      throw new NotFoundException('Workout plan not found');
    }

    const updatedPlan = await this.workoutRepository.update(planId, { schedule });
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
}
