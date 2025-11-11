import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DayOfWeek, SessionStatus } from '../../common/enums';

export class ExerciseSet {
  @Prop({ required: true })
  reps!: number;

  @Prop({ required: true })
  weight!: number;
}

export class ExerciseLog {
  @Prop({ required: true })
  exerciseId!: string;

  @Prop({ type: [ExerciseSet], required: true })
  sets!: ExerciseSet[];
}

@Schema({ timestamps: true })
export class TrainingSession extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  planId!: string;

  @Prop({ type: String, enum: DayOfWeek, required: true })
  dayOfWeek!: DayOfWeek;

  @Prop({ required: true })
  startTime!: Date;

  @Prop()
  endTime?: Date;

  @Prop({ type: [ExerciseLog], default: [] })
  exercises!: ExerciseLog[];

  @Prop({ type: String, enum: SessionStatus, required: true })
  status!: SessionStatus;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const TrainingSessionSchema = SchemaFactory.createForClass(TrainingSession);

