import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [ConfigModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, TelegramService],
})
export class FeedbackModule {}
