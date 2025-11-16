import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ActivityLevel,
  DayOfWeek,
  ExperienceLevel,
  Gender,
  Goal,
  Language,
  SubscriptionPlan,
} from '../../common/enums';

// Nested subscription schema
export class GenerationUsage {
  @Prop({ type: Number, default: 0 })
  used!: number;

  @Prop({ type: Number, required: false })
  limit?: number;
}

export class SubscriptionInfo {
  @Prop({ type: String, default: SubscriptionPlan.FREE })
  plan!: SubscriptionPlan;

  @Prop({ type: Date, default: () => new Date() })
  periodStart!: Date; // Start of current billing period

  @Prop({
    type: GenerationUsage,
    default: () => ({ used: 0 }),
  })
  workoutGeneration!: GenerationUsage;

  @Prop({
    type: GenerationUsage,
    default: () => ({ used: 0 }),
  })
  mealGeneration!: GenerationUsage;

  @Prop({
    type: GenerationUsage,
    default: () => ({ used: 0 }),
  })
  inbodyScan!: GenerationUsage;

  @Prop({
    type: GenerationUsage,
    default: () => ({ used: 0 }),
  })
  bodyPhotoScan!: GenerationUsage;
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  cognitoSub!: string;

  @Prop({ type: String, enum: Goal })
  goal?: Goal;

  @Prop({ type: String, enum: ExperienceLevel })
  experienceLevel?: ExperienceLevel;

  @Prop()
  height?: number;

  @Prop()
  weight?: number;

  @Prop()
  targetWeight?: number;

  @Prop()
  age?: number;

  @Prop({ type: String, enum: Gender })
  gender?: Gender;

  @Prop({ type: String, enum: ActivityLevel })
  activityLevel?: ActivityLevel;

  @Prop({ type: [String], enum: DayOfWeek, default: [] })
  scheduleDays!: DayOfWeek[];

  @Prop({ type: String, default: Language.EN })
  language!: Language; // 'en' or 'vi'

  // Subscription (nested structure)
  @Prop({
    type: SubscriptionInfo,
    // NOTE: don't set limit here, it will be set in the subscription guard
    default: () => ({
      plan: SubscriptionPlan.FREE,
      periodStart: new Date(),
      workoutGeneration: { used: 0 },
      mealGeneration: { used: 0 },
      inbodyScan: { used: 0 },
      bodyPhotoScan: { used: 0 },
    }),
  })
  subscription!: SubscriptionInfo;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
