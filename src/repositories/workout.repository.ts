import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '@common/base';
import { WorkoutPlan } from './schemas/workout-plan.schema';

@Injectable()
export class WorkoutRepository extends BaseRepository<WorkoutPlan> {
  constructor(@InjectModel(WorkoutPlan.name) workoutPlanModel: Model<WorkoutPlan>) {
    super(workoutPlanModel);
  }

  async findByUserAndWeek(userId: string, week: number, year: number): Promise<WorkoutPlan | null> {
    return this.findOne({ userId, week, year });
  }

  async findCurrentWeekPlan(userId: string): Promise<WorkoutPlan | null> {
    const now = new Date();
    const week = this.getWeekNumber(now);
    const year = now.getFullYear();
    return this.findByUserAndWeek(userId, week, year);
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

