import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrainingSessionRepository, UserRepository } from '../../repositories';
import { TrainingSession } from '../../repositories';
import { SessionStatus, DayOfWeek, EventName } from '../../common/enums';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { LogExerciseDto } from './dto/log-exercise.dto';
import { ExerciseLoggedEvent } from '../analytics/events/exercise-logged.event';

@Injectable()
export class TrainingService {
  constructor(
    private readonly trainingSessionRepository: TrainingSessionRepository,
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  async startSession(userId: string, startSessionDto: StartSessionDto): Promise<TrainingSession> {
    // Check if there's already an active session
    const activeSession = await this.trainingSessionRepository.findActiveSession(userId);
    if (activeSession) {
      throw new BadRequestException('You already have an active training session');
    }
    // Create new session
    return this.trainingSessionRepository.create({
      userId,
      planId: startSessionDto.planId,
      dayOfWeek: startSessionDto.dayOfWeek,
      startTime: new Date(),
      exercises: [],
      status: SessionStatus.IN_PROGRESS,
    });
  }
  async getActiveSession(userId: string): Promise<TrainingSession | null> {
    const session = await this.trainingSessionRepository.findActiveSession(userId);

    if (session) {
      // Check if session is from a past day
      const isPastDay = this.isSessionFromPastDay(session.dayOfWeek);

      if (isPastDay) {
        // Auto-complete the old session
        const sessionDoc = session as unknown as {
          _id?: { toString: () => string };
          id?: { toString: () => string };
        };
        const sessionId = sessionDoc._id?.toString() || sessionDoc.id?.toString();
        if (sessionId) {
          await this.trainingSessionRepository.update(sessionId, {
            endTime: new Date(),
            status: SessionStatus.COMPLETED,
          });
        }
        return null; // Return null since the old session is now completed
      }
    }
    return session;
  }
  private isSessionFromPastDay(sessionDay: DayOfWeek): boolean {
    const today = new Date();
    const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Monday = 0, Sunday = 6

    const dayOrder = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
      DayOfWeek.SUNDAY,
    ];

    const sessionDayIndex = dayOrder.indexOf(sessionDay);

    // If session day is before current day in the week
    return sessionDayIndex < currentDayIndex;
  }
  async getSessionById(userId: string, sessionId: string): Promise<TrainingSession> {
    const session = await this.trainingSessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Training session not found');
    }
    return session;
  }
  async updateSession(
    userId: string,
    sessionId: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<TrainingSession> {
    const session = await this.getSessionById(userId, sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot update a completed or cancelled session');
    }
    const updatedSession = await this.trainingSessionRepository.update(sessionId, {
      exercises: updateSessionDto.exercises,
    });

    if (!updatedSession) {
      throw new NotFoundException('Failed to update session');
    }
    return updatedSession;
  }
  async logExercise(
    userId: string,
    sessionId: string,
    logExerciseDto: LogExerciseDto,
  ): Promise<TrainingSession> {
    const session = await this.getSessionById(userId, sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot log exercises for a completed or cancelled session');
    }
    const updatedSession = await this.trainingSessionRepository.update(sessionId, {
      exercises: logExerciseDto.exercises,
    });

    if (!updatedSession) {
      throw new NotFoundException('Failed to log exercise');
    }
    // Emit event for background award processing
    this.eventEmitter.emit(
      EventName.EXERCISE_LOGGED,
      new ExerciseLoggedEvent(userId, sessionId, logExerciseDto.exercises),
    );

    return updatedSession;
  }
  async completeSession(userId: string, sessionId: string): Promise<TrainingSession> {
    const session = await this.getSessionById(userId, sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not in progress');
    }

    // Get user data for accurate calorie calculation
    const user = await this.userRepository.findById(userId);
    const duration = session.startTime
      ? Math.round((new Date().getTime() - session.startTime.getTime()) / 60000)
      : 0;

    // Calculate calories for each exercise and total
    const exercisesWithCalories = session.exercises.map((exercise) => {
      const calories = this.calculateExerciseCalories(exercise, user, duration);
      return { ...exercise, calories };
    });

    const totalCalories = exercisesWithCalories.reduce((sum, ex) => sum + (ex.calories || 0), 0);

    const updatedSession = await this.trainingSessionRepository.update(sessionId, {
      endTime: new Date(),
      status: SessionStatus.COMPLETED,
      exercises: exercisesWithCalories,
      totalCalories,
      duration,
    });

    if (!updatedSession) {
      throw new NotFoundException('Failed to complete session');
    }
    return updatedSession;
  }

  /**
   * Calculate calories burned based on exercise volume, user weight, and duration
   * Formula: (MET * weight_kg * duration_min) / 60 + (volume * intensity_factor)
   * MET for strength training: 3-6 (based on intensity)
   */
  private calculateExerciseCalories(
    exercise: { sets: Array<{ reps: number; weight: number }> },
    user: {
      weight?: number;
      height?: number;
      age?: number;
      gender?: string;
      activityLevel?: string;
    } | null,
    sessionDuration: number,
  ): number {
    const totalVolume = exercise.sets.reduce((sum, set) => sum + set.reps * set.weight, 0);
    const avgWeightPerSet = exercise.sets.length > 0 ? totalVolume / exercise.sets.length : 0;
    const userWeight = user?.weight || 70; // Default 70kg if not available

    // Calculate intensity based on weight lifted relative to body weight
    const intensityRatio = userWeight > 0 ? avgWeightPerSet / userWeight : 0;
    let met = 3; // Base MET for light strength training

    if (intensityRatio > 0.8) {
      met = 6; // High intensity
    } else if (intensityRatio > 0.5) {
      met = 5; // Moderate intensity
    } else if (intensityRatio > 0.2) {
      met = 4; // Light-moderate
    }

    // Calculate calories: MET * weight * duration / 60
    // Add volume-based component for accuracy
    const durationPerExercise = sessionDuration / Math.max(exercise.sets.length, 1);
    const baseCalories = (met * userWeight * durationPerExercise) / 60;
    const volumeCalories = totalVolume * 0.03; // Volume contribution

    return Math.round(baseCalories + volumeCalories);
  }
  async cancelSession(userId: string, sessionId: string): Promise<TrainingSession> {
    const session = await this.getSessionById(userId, sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not in progress');
    }
    const updatedSession = await this.trainingSessionRepository.update(sessionId, {
      endTime: new Date(),
      status: SessionStatus.CANCELLED,
    });

    if (!updatedSession) {
      throw new NotFoundException('Failed to cancel session');
    }
    return updatedSession;
  }
  async getRecentSessions(userId: string, limit: number = 10): Promise<TrainingSession[]> {
    return this.trainingSessionRepository.findRecentSessions(userId, limit);
  }
  async getUserSessions(userId: string): Promise<TrainingSession[]> {
    return this.trainingSessionRepository.findByUser(userId);
  }
  async getSessionsByStatus(userId: string, status: SessionStatus): Promise<TrainingSession[]> {
    return this.trainingSessionRepository.findByUserAndStatus(userId, status);
  }
  async getSessionsByMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<TrainingSession[]> {
    // month is 1-12, convert to 0-11 for Date
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    return this.trainingSessionRepository.find({
      userId,
      startTime: {
        $gte: startDate,
        $lte: endDate,
      },
      status: SessionStatus.COMPLETED,
    });
  }
}
