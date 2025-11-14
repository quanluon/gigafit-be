import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base';
import { TrainingSession } from './schemas/training-session.schema';
import { SessionStatus } from '../common/enums';

@Injectable()
export class TrainingSessionRepository extends BaseRepository<TrainingSession> {
  constructor(@InjectModel(TrainingSession.name) trainingSessionModel: Model<TrainingSession>) {
    super(trainingSessionModel);
  }

  getModel(): Model<TrainingSession> {
    return this.model;
  }

  async findByUser(userId: string): Promise<TrainingSession[]> {
    return this.find({ userId });
  }

  async findActiveSession(userId: string): Promise<TrainingSession | null> {
    return this.findOne({ userId, status: SessionStatus.IN_PROGRESS });
  }

  async findByUserAndStatus(userId: string, status: SessionStatus): Promise<TrainingSession[]> {
    return this.find({ userId, status });
  }

  async findRecentSessions(userId: string, limit: number = 10): Promise<TrainingSession[]> {
    return this.model.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }
}
