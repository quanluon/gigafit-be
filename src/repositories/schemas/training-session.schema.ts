import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DayOfWeek, SessionStatus } from '../../common/enums';
import { Translatable } from '../../common/interfaces';

@Schema({ _id: false })
export class ExerciseSet {
  @Prop({ required: true })
  reps!: number;

  @Prop({ required: true })
  weight!: number;
}

const ExerciseSetSchema = SchemaFactory.createForClass(ExerciseSet);

@Schema({ _id: false })
export class ExerciseLog {
  @Prop({ required: true })
  exerciseId!: string;

  @Prop({ type: Object, required: true })
  name!: Translatable; // Exercise name (en/vi)

  @Prop({ type: Object })
  description?: Translatable; // Exercise description (en/vi)

  @Prop()
  muscleGroup?: string; // Primary muscle group (e.g., "Chest", "Back", "Legs")

  @Prop({ type: [ExerciseSetSchema], required: true })
  sets!: ExerciseSet[];

  @Prop({ type: Number })
  calories?: number; // Calories burned for this exercise

  @Prop()
  notes?: string; // User notes about this exercise

  @Prop()
  videoUrl?: string; // Reference video URL
}

const ExerciseLogSchema = SchemaFactory.createForClass(ExerciseLog);

@Schema({ timestamps: true })
export class TrainingSession extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  planId!: string;

  @Prop({ type: String, enum: DayOfWeek, required: true })
  dayOfWeek!: DayOfWeek;

  @Prop({ type: Object })
  workoutFocus?: Translatable; // Workout focus (e.g., "Chest & Triceps")

  @Prop({ required: true })
  startTime!: Date;

  @Prop()
  endTime?: Date;

  @Prop({ type: [ExerciseLogSchema], default: [] })
  exercises!: ExerciseLog[];

  @Prop({ type: String, enum: SessionStatus, required: true })
  status!: SessionStatus;

  @Prop()
  totalVolume?: number; // Total weight lifted (sets * reps * weight)

  @Prop()
  totalSets?: number; // Total number of sets completed

  @Prop()
  duration?: number; // Duration in minutes

  @Prop({ type: Number })
  totalCalories?: number; // Total calories burned in this session

  @Prop()
  notes?: string; // Session notes

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const TrainingSessionSchema = SchemaFactory.createForClass(TrainingSession);
