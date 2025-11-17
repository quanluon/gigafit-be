import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken?: string;
  private readonly chatId?: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('telegram.botToken');
    this.chatId = this.configService.get<string>('telegram.chatId');
    const envEnabled = this.configService.get<boolean>('telegram.enabled');
    this.isEnabled = Boolean(envEnabled && this.botToken && this.chatId);
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.isEnabled) {
      this.logger.debug('Telegram notifications disabled (missing config)');
      return;
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    try {
      await axios.post(url, {
        chat_id: this.chatId,
        text,
        disable_web_page_preview: true,
      });
    } catch (error) {
      this.logger.error('Failed to send Telegram notification', error as Error);
    }
  }
}

