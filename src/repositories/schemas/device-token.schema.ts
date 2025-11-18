import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  UNKNOWN = 'unknown',
}
@Schema({ timestamps: true })
export class DeviceToken extends Document {
  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true })
  deviceId!: string;

  @Prop({ type: String, required: true })
  token!: string;

  @Prop({
    type: String,
    enum: Object.values(DevicePlatform),
    default: DevicePlatform.WEB,
  })
  platform!: DevicePlatform;
}
export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);

DeviceTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
DeviceTokenSchema.index({ token: 1 }, { unique: true });
