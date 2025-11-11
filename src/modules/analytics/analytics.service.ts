import { Injectable } from '@nestjs/common';
import {
  TrainingSessionRepository,
  AwardRepository,
  WeightLogRepository,
  Award,
  WeightLog,
} from 'src/repositories';
import { SessionStatus } from 'src/common/enums';

interface WeightHistory {
  date: string;
  weight: number;
}

interface ProgressStats {
  totalSessions: number;
  completedSessions: number;
  totalWorkoutTime: number;
  averageWorkoutDuration: number;
  currentStreak: number;
}

interface ExercisePR {
  exerciseName: string;
  maxWeight: number;
  date: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly trainingSessionRepository: TrainingSessionRepository,
    private readonly awardRepository: AwardRepository,
    private readonly weightLogRepository: WeightLogRepository,
  ) {}

  async getWeightHistory(userId: string, days: number = 90): Promise<WeightHistory[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.weightLogRepository.findByUserInDateRange(userId, startDate, endDate);

    return logs.map((log) => ({
      date: log.date.toISOString(),
      weight: log.weight,
    }));
  }

  async logWeight(userId: string, weight: number, notes?: string): Promise<WeightLog> {
    return this.weightLogRepository.create({
      userId,
      weight,
      date: new Date(),
      notes,
    });
  }

  async getProgressStats(userId: string): Promise<ProgressStats> {
    const allSessions = await this.trainingSessionRepository.findByUser(userId);
    const completedSessions = allSessions.filter((s) => s.status === SessionStatus.COMPLETED);

    let totalWorkoutTime = 0;
    completedSessions.forEach((session) => {
      if (session.startTime && session.endTime) {
        const duration = session.endTime.getTime() - session.startTime.getTime();
        totalWorkoutTime += duration;
      }
    });

    const averageWorkoutDuration =
      completedSessions.length > 0 ? totalWorkoutTime / completedSessions.length : 0;

    const currentStreak = await this.calculateStreak(userId);

    return {
      totalSessions: allSessions.length,
      completedSessions: completedSessions.length,
      totalWorkoutTime,
      averageWorkoutDuration,
      currentStreak,
    };
  }

  async getExercisePRs(userId: string): Promise<ExercisePR[]> {
    const sessions = await this.trainingSessionRepository.findByUserAndStatus(
      userId,
      SessionStatus.COMPLETED,
    );

    const prMap = new Map<string, { weight: number; date: Date }>();

    sessions.forEach((session) => {
      session.exercises.forEach((exerciseLog) => {
        const maxSetWeight = Math.max(...exerciseLog.sets.map((s) => s.weight));
        const existing = prMap.get(exerciseLog.exerciseId);

        if (!existing || maxSetWeight > existing.weight) {
          prMap.set(exerciseLog.exerciseId, {
            weight: maxSetWeight,
            date: session.createdAt,
          });
        }
      });
    });

    return Array.from(prMap.entries()).map(([exerciseName, data]) => ({
      exerciseName,
      maxWeight: data.weight,
      date: data.date.toISOString(),
    }));
  }

  async calculatePercentile(exerciseName: string, weight: number): Promise<number> {
    const allSessions = await this.trainingSessionRepository.find({});
    const weights: number[] = [];

    allSessions.forEach((session) => {
      session.exercises.forEach((exerciseLog) => {
        if (exerciseLog.exerciseId === exerciseName) {
          exerciseLog.sets.forEach((set) => {
            weights.push(set.weight);
          });
        }
      });
    });

    if (weights.length === 0) return 100;

    const lowerWeights = weights.filter((w) => w < weight).length;
    return Math.round((lowerWeights / weights.length) * 100);
  }

  async createAward(
    userId: string,
    exerciseName: string,
    value: number,
    type: string,
  ): Promise<Award> {
    const percentile = await this.calculatePercentile(exerciseName, value);

    return this.awardRepository.create({
      userId,
      exerciseName,
      value,
      date: new Date(),
      percentile,
      type,
    });
  }

  async getUserAwards(userId: string, limit: number = 10): Promise<Award[]> {
    return this.awardRepository.findByUser(userId, limit);
  }

  async getTopAwards(userId: string, limit: number = 5): Promise<Award[]> {
    return this.awardRepository.getTopAwards(userId, limit);
  }

  private async calculateStreak(userId: string): Promise<number> {
    const sessions = await this.trainingSessionRepository.findByUserAndStatus(
      userId,
      SessionStatus.COMPLETED,
    );

    if (sessions.length === 0) return 0;

    // Sort by date descending
    const sortedSessions = sessions.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.createdAt);
      sessionDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (dayDiff === 0 || dayDiff === 1) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  }
}

