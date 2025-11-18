import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AwardType {
  PR = 'pr',
  STREAK = 'streak',
  WEIGHT_MILESTONE = 'weight_milestone',
}
@Schema({ timestamps: true })
export class Award extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  exerciseName!: string;

  @Prop({ required: true })
  value!: number;

  @Prop({ required: true })
  date!: Date;

  @Prop({ required: true })
  percentile!: number;

  @Prop({ type: String, required: true })
  type!: AwardType;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const AwardSchema = SchemaFactory.createForClass(Award);
