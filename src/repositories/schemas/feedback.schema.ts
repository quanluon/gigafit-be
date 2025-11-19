import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FeedbackContext } from '../../common/enums';

@Schema({ timestamps: true, collection: 'beta_feedback' })
export class Feedback extends Document {
  @Prop({ required: true, trim: true, maxlength: 1200 })
  message!: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({
    required: true,
    enum: Object.values(FeedbackContext),
    default: FeedbackContext.GENERAL,
    type: String,
  })
  context!: FeedbackContext;

  @Prop({ trim: true })
  userId?: string;

  @Prop({ trim: true })
  path?: string;

  @Prop()
  locale?: string;

  @Prop()
  appVersion?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;
}
export type FeedbackDocument = Feedback & Document;
export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
