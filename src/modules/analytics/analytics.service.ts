import { Injectable } from '@nestjs/common';
import {
  TrainingSessionRepository,
  AwardRepository,
  WeightLogRepository,
  Award,
  WeightLog,
} from '../../repositories';
import { SessionStatus } from '../../common/enums';

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
    const model = this.trainingSessionRepository.getModel();

    // Use aggregation pipeline for better performance
    const stats = await model.aggregate([
      { $match: { userId } },
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                completedSessions: {
                  $sum: {
                    $cond: [{ $eq: ['$status', SessionStatus.COMPLETED] }, 1, 0],
                  },
                },
              },
            },
          ],
          completedSessionsStats: [
            { $match: { status: SessionStatus.COMPLETED } },
            {
              $group: {
                _id: null,
                totalWorkoutTime: {
                  $sum: {
                    $subtract: ['$endTime', '$startTime'],
                  },
                },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const totalStats = stats[0]?.totalStats[0] || {
      totalSessions: 0,
      completedSessions: 0,
    };
    const completedStats = stats[0]?.completedSessionsStats[0] || {
      totalWorkoutTime: 0,
      count: 0,
    };

    const currentStreak = await this.calculateStreak(userId);

    return {
      totalSessions: totalStats.totalSessions,
      completedSessions: totalStats.completedSessions,
      totalWorkoutTime: completedStats.totalWorkoutTime || 0,
      averageWorkoutDuration:
        completedStats.count > 0 ? completedStats.totalWorkoutTime / completedStats.count : 0,
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

  async checkIfNewPR(userId: string, exerciseId: string, weight: number): Promise<boolean> {
    const model = this.trainingSessionRepository.getModel();

    // Use aggregation to find the max weight for this exercise by this user
    const result = await model.aggregate([
      { $match: { userId, status: SessionStatus.COMPLETED } },
      { $unwind: '$exercises' },
      { $match: { 'exercises.exerciseId': exerciseId } },
      { $unwind: '$exercises.sets' },
      {
        $group: {
          _id: null,
          maxWeight: { $max: '$exercises.sets.weight' },
        },
      },
    ]);

    if (result.length === 0) {
      // First time doing this exercise - it's a PR!
      return weight > 0;
    }

    const currentMaxWeight = result[0].maxWeight || 0;
    return weight > currentMaxWeight;
  }

  async createAward(
    userId: string,
    exerciseName: string,
    exerciseId: string,
    value: number,
    type: string,
  ): Promise<Award> {
    const percentile = await this.calculatePercentile(exerciseId, value);

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
    const sortedSessions = sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
