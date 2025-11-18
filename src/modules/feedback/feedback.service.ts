import { Injectable } from '@nestjs/common';
import { FeedbackRepository } from '../../repositories';
import { Feedback } from '../../repositories/schemas/feedback.schema';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { TelegramService } from './telegram.service';

export interface FeedbackMetadata {
  userAgent?: string;
  ipAddress?: string;
  locale?: string;
  appVersion?: string;
}
@Injectable()
export class FeedbackService {
  constructor(
    private readonly feedbackRepository: FeedbackRepository,
    private readonly telegramService: TelegramService,
  ) {}
  async submitFeedback(
    payload: CreateFeedbackDto,
    metadata: FeedbackMetadata = {},
  ): Promise<Feedback> {
    const { userAgent, ipAddress, locale, appVersion } = metadata;

    const feedback = await this.feedbackRepository.create({
      ...payload,
      locale: payload.locale || locale,
      appVersion: payload.appVersion || appVersion,
      userAgent,
      ipAddress,
    } as Feedback);

    void this.telegramService.sendMessage(this.buildTelegramMessage(feedback));

    return feedback;
  }
  private buildTelegramMessage(feedback: Feedback): string {
    const lines: string[] = [
      '💬 New beta feedback received',
      `Context: ${feedback.context}`,
      `Message: ${this.truncate(feedback.message, 600)}`,
    ];

    if (feedback.email) {
      lines.push(`Email: ${feedback.email}`);
    }
    if (feedback.userId) {
      lines.push(`User ID: ${feedback.userId}`);
    }
    if (feedback.path) {
      lines.push(`Path: ${feedback.path}`);
    }
    if (feedback.locale) {
      lines.push(`Locale: ${feedback.locale}`);
    }
    if (feedback.appVersion) {
      lines.push(`App Version: ${feedback.appVersion}`);
    }
    if (feedback.userAgent) {
      lines.push(`UA: ${this.truncate(feedback.userAgent, 120)}`);
    }
    if (feedback.ipAddress) {
      lines.push(`IP: ${feedback.ipAddress}`);
    }
    return lines.join('\n');
  }
  private truncate(value: string, limit: number): string {
    if (value.length <= limit) {
      return value;
    }
    return `${value.slice(0, limit - 3)}...`;
  }
}
