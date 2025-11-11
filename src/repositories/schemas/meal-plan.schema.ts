import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DayOfWeek, MealType } from '../../common/enums';
import { Translatable } from '../../common/interfaces';

export class Macros {
  @Prop({ required: true })
  calories!: number;

  @Prop({ required: true })
  protein!: number;

  @Prop({ required: true })
  carbs!: number;

  @Prop({ required: true })
  fat!: number;
}

export class MealItem {
  @Prop({ type: Object, required: true })
  name!: Translatable;

  @Prop({ type: Object })
  description?: Translatable;

  @Prop({ required: true })
  quantity!: string;

  @Prop({ type: Macros, required: true })
  macros!: Macros;
}

export class Meal {
  @Prop({ type: String, enum: MealType, required: true })
  type!: MealType;

  @Prop({ type: [MealItem], required: true })
  items!: MealItem[];

  @Prop({ type: Macros, required: true })
  totalMacros!: Macros;
}

export class DailyMealPlan {
  @Prop({ type: String, enum: DayOfWeek, required: true })
  dayOfWeek!: DayOfWeek;

  @Prop({ type: [Meal], required: true })
  meals!: Meal[];

  @Prop({ type: Macros, required: true })
  dailyTotals!: Macros;
}

@Schema({ timestamps: true })
export class MealPlan extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  week!: number;

  @Prop({ required: true })
  year!: number;

  @Prop({ type: Macros, required: true })
  dailyTargets!: Macros;

  @Prop({ required: true })
  tdee!: number;

  @Prop({ type: [DailyMealPlan], required: true })
  schedule!: DailyMealPlan[];

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const MealPlanSchema = SchemaFactory.createForClass(MealPlan);
