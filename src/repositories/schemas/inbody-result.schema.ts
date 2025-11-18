import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { InbodyStatus } from '../../common/enums';
import { Translatable, InbodyAnalysis } from '../../common/interfaces';

export class SegmentMeasurement {
  @Prop({ type: String })
  label?: string;

  @Prop({ type: Number })
  value?: number;

  @Prop({ type: Number })
  percentage?: number;
}
export enum InbodySourceType {
  INBODY_SCAN = 'inbody_scan',
  BODY_PHOTO = 'body_photo',
}
@Schema({ timestamps: true, collection: 'inbody_results' })
export class InbodyResult extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ type: String, enum: InbodyStatus, default: InbodyStatus.PENDING })
  status!: InbodyStatus;

  @Prop({
    type: String,
    enum: InbodySourceType,
    default: InbodySourceType.INBODY_SCAN,
  })
  sourceType!: InbodySourceType;

  @Prop()
  s3Url!: string;

  @Prop({ required: false })
  sourceFilePath?: string;

  @Prop()
  originalFilename!: string;

  @Prop()
  ocrText?: string;

  @Prop({ type: Object })
  metrics?: {
    weight?: number;
    skeletalMuscleMass?: number;
    bodyFatMass?: number;
    bodyFatPercent?: number;
    bmi?: number;
    height?: number; // Estimated height from body photo analysis
    visceralFatLevel?: number;
    basalMetabolicRate?: number;
    totalBodyWater?: number;
    protein?: number;
    minerals?: number;
    segmentalLean?: SegmentMeasurement[];
    segmentalFat?: SegmentMeasurement[];
  };

  @Prop({ type: Object })
  aiAnalysis?: Translatable | InbodyAnalysis;

  @Prop({ default: () => new Date() })
  takenAt?: Date;

  @Prop()
  errorMessage?: string;
}
export const InbodyResultSchema = SchemaFactory.createForClass(InbodyResult);
