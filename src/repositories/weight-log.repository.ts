import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base';
import { WeightLog } from './schemas/weight-log.schema';

@Injectable()
export class WeightLogRepository extends BaseRepository<WeightLog> {
  constructor(@InjectModel(WeightLog.name) weightLogModel: Model<WeightLog>) {
    super(weightLogModel);
  }

  async findByUser(userId: string, limit: number = 30): Promise<WeightLog[]> {
    return this.model.find({ userId }).sort({ date: -1 }).limit(limit).exec();
  }

  async findByUserInDateRange(userId: string, startDate: Date, endDate: Date): Promise<WeightLog[]> {
    return this.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });
  }

  async getLatestWeight(userId: string): Promise<WeightLog | null> {
    return this.model.findOne({ userId }).sort({ date: -1 }).exec();
  }
}

