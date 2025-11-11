import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class WeightLog extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  weight!: number;

  @Prop({ required: true })
  date!: Date;

  @Prop()
  notes?: string;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const WeightLogSchema = SchemaFactory.createForClass(WeightLog);
