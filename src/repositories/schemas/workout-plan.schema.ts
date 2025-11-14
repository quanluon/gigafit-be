import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DayOfWeek, PlanSource } from '../../common/enums';
import { Translatable } from '../../common/interfaces';

export class Exercise {
  @Prop({ type: String, ref: 'Exercise' })
  exerciseId?: string;

  @Prop({ type: Object, required: true })
  name!: Translatable;

  @Prop({ type: Object, required: true })
  description!: Translatable;

  @Prop({ required: true })
  sets!: number;

  @Prop({ required: true })
  reps!: string;

  @Prop({ required: true })
  videoUrl!: string;
}

export class WorkoutDay {
  @Prop({ type: String, enum: DayOfWeek, required: true })
  dayOfWeek!: DayOfWeek;

  @Prop({ type: Object, required: true })
  focus!: Translatable;

  @Prop({ type: [Exercise], required: true })
  exercises!: Exercise[];
}

@Schema({ timestamps: true })
export class WorkoutPlan extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ type: String, enum: PlanSource, default: PlanSource.AI })
  source!: PlanSource;

  @Prop()
  title?: string;

  @Prop({ required: true })
  week!: number;

  @Prop({ required: true })
  year!: number;

  @Prop({ type: [WorkoutDay], required: true })
  schedule!: WorkoutDay[];

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const WorkoutPlanSchema = SchemaFactory.createForClass(WorkoutPlan);
