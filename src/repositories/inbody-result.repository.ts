import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base';
import { InbodyResult } from './schemas/inbody-result.schema';
import { InbodyStatus } from '../common/enums';

@Injectable()
export class InbodyResultRepository extends BaseRepository<InbodyResult> {
  constructor(@InjectModel(InbodyResult.name) model: Model<InbodyResult>) {
    super(model);
  }
  async findLatestCompleted(userId: string): Promise<InbodyResult | null> {
    return this.model
      .findOne({ userId, status: InbodyStatus.COMPLETED })
      .sort({ takenAt: -1, createdAt: -1 })
      .lean<InbodyResult>()
      .exec();
  }
}
