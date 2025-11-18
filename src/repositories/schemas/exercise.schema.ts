import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Translatable } from '../../common/interfaces';

export enum VideoSource {
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok',
  MANUAL = 'manual',
}

export enum MuscleGroup {
  CHEST = 'chest',
  BACK = 'back',
  LEGS = 'legs',
  SHOULDERS = 'shoulders',
  ARMS = 'arms',
  CORE = 'core',
  CARDIO = 'cardio',
  FULL_BODY = 'full_body',
}
@Schema({ _id: false })
export class VideoMetadata {
  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop()
  channelName?: string;

  @Prop()
  duration?: number; // in seconds

  @Prop()
  viewCount?: number;

  @Prop()
  likeCount?: number;

  @Prop()
  publishedAt?: Date;
}
@Schema({ timestamps: true })
export class Exercise extends Document {
  @Prop({ type: Object, required: true })
  name!: Translatable;

  @Prop({ type: [String], required: true })
  keywords!: string[]; // For matching (lowercased)

  @Prop({ required: true })
  videoUrl!: string;

  @Prop({ type: String, enum: VideoSource, required: true })
  source!: VideoSource;

  @Prop({ type: [String], enum: MuscleGroup, required: true })
  muscleGroups!: MuscleGroup[];

  @Prop({ type: VideoMetadata })
  metadata?: VideoMetadata;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  usageCount!: number; // Track how often this video is used

  @Prop()
  thumbnailUrl?: string;

  @Prop({ type: Date })
  lastCrawledAt?: Date;

  @Prop({ type: Date })
  createdAt!: Date;

  @Prop({ type: Date })
  updatedAt!: Date;
}

export const ExerciseSchema = SchemaFactory.createForClass(Exercise);

// Create indexes for efficient searching
ExerciseSchema.index({ keywords: 1 });
ExerciseSchema.index({ muscleGroups: 1 });
ExerciseSchema.index({ source: 1 });
ExerciseSchema.index({ isActive: 1 });
ExerciseSchema.index({ usageCount: -1 }); // Most used first
