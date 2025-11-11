import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TrainingSessionRepository } from '@/repositories';
import { TrainingSession } from '@/repositories';
import { SessionStatus, DayOfWeek } from '@common/enums';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { LogExerciseDto } from './dto/log-exercise.dto';

@Injectable()
export class TrainingService {
  constructor(private readonly trainingSessionRepository: TrainingSessionRepository) {}

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
        const sessionId = (session as any)._id?.toString() || session.id?.toString();
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

    return updatedSession;
  }

  async completeSession(userId: string, sessionId: string): Promise<TrainingSession> {
    const session = await this.getSessionById(userId, sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Session is not in progress');
    }

    const updatedSession = await this.trainingSessionRepository.update(sessionId, {
      endTime: new Date(),
      status: SessionStatus.COMPLETED,
    });

    if (!updatedSession) {
      throw new NotFoundException('Failed to complete session');
    }

    return updatedSession;
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
}
