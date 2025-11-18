import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base';
import { DeviceToken } from './schemas/device-token.schema';

@Injectable()
export class DeviceTokenRepository extends BaseRepository<DeviceToken> {
  constructor(@InjectModel(DeviceToken.name) deviceTokenModel: Model<DeviceToken>) {
    super(deviceTokenModel);
  }
  async upsertToken(
    userId: string,
    deviceId: string,
    token: string,
    platform?: string,
  ): Promise<DeviceToken> {
    return this.model
      .findOneAndUpdate(
        { userId, deviceId },
        {
          userId,
          deviceId,
          token,
          platform,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean<DeviceToken>()
      .exec();
  }
  async removeByDevice(userId: string, deviceId: string): Promise<void> {
    await this.model.deleteOne({ userId, deviceId }).exec();
  }
  async findByUser(userId: string): Promise<DeviceToken[]> {
    return this.model.find({ userId }).lean<DeviceToken[]>().exec();
  }
}
