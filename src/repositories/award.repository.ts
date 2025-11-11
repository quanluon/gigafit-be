import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base';
import { Award } from './schemas/award.schema';

@Injectable()
export class AwardRepository extends BaseRepository<Award> {
  constructor(@InjectModel(Award.name) awardModel: Model<Award>) {
    super(awardModel);
  }

  async findByUser(userId: string, limit: number = 10): Promise<Award[]> {
    return this.model.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async findByUserAndExercise(userId: string, exerciseName: string): Promise<Award[]> {
    return this.find({ userId, exerciseName });
  }

  async getTopAwards(userId: string, limit: number = 5): Promise<Award[]> {
    return this.model.find({ userId }).sort({ percentile: -1, value: -1 }).limit(limit).exec();
  }
}
