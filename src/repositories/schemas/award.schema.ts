import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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
  type!: string; // 'pr', 'streak', 'weight_milestone'

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const AwardSchema = SchemaFactory.createForClass(Award);
