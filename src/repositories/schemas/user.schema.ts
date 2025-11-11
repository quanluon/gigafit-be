import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Goal, ExperienceLevel, DayOfWeek, ActivityLevel, Gender } from '@common/enums';

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

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
