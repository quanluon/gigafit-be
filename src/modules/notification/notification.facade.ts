import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { GenerationType, Language } from '../../common/enums';
import { DeviceTokenRepository, UserRepository } from '../../repositories';

interface NotificationContent {
  title: Record<Language, string>;
  body: Record<Language, string>;
}
type NotificationCategory = 'complete' | 'error';

interface GenerationNotificationPayload {
  userId: string;
  jobId: string | number;
  generationType: GenerationType;
  planId?: string;
  resultId?: string;
  error?: string;
}
const NOTIFICATION_APP_NAME = 'gigafit-notifications';

const generationMessages: Record<
  NotificationCategory,
  Record<GenerationType, NotificationContent>
> = {
  complete: {
    [GenerationType.WORKOUT]: {
      title: {
        [Language.EN]: 'Workout plan ready',
        [Language.VI]: 'Kế hoạch tập luyện đã sẵn sàng',
      },
      body: {
        [Language.EN]: 'Open GigaFit to review your personalized workout plan.',
        [Language.VI]: 'Mở GigaFit để xem kế hoạch tập luyện cá nhân hóa của bạn.',
      },
    },
    [GenerationType.MEAL]: {
      title: {
        [Language.EN]: 'Meal plan ready',
        [Language.VI]: 'Kế hoạch ăn uống đã hoàn tất',
      },
      body: {
        [Language.EN]: 'Tap to view your weekly meals and macro breakdown.',
        [Language.VI]: 'Chạm để xem thực đơn và macro chi tiết của bạn.',
      },
    },
    [GenerationType.INBODY]: {
      title: {
        [Language.EN]: 'InBody scan analyzed',
        [Language.VI]: 'Báo cáo InBody đã được phân tích',
      },
      body: {
        [Language.EN]: 'See the latest metrics and insights from your scan.',
        [Language.VI]: 'Xem số liệu và nhận xét mới nhất từ báo cáo của bạn.',
      },
    },
    [GenerationType.BODY_PHOTO]: {
      title: {
        [Language.EN]: 'Body analysis ready',
        [Language.VI]: 'Phân tích ảnh cơ thể đã sẵn sàng',
      },
      body: {
        [Language.EN]: 'Open the app to review your updated body insights.',
        [Language.VI]: 'Mở ứng dụng để xem các nhận xét mới nhất về cơ thể.',
      },
    },
  },
  error: {
    [GenerationType.WORKOUT]: {
      title: {
        [Language.EN]: 'Workout plan failed',
        [Language.VI]: 'Tạo kế hoạch tập luyện thất bại',
      },
      body: {
        [Language.EN]: 'Please try again or contact support if the issue persists.',
        [Language.VI]: 'Vui lòng thử lại hoặc liên hệ hỗ trợ nếu lỗi tiếp tục.',
      },
    },
    [GenerationType.MEAL]: {
      title: {
        [Language.EN]: 'Meal plan failed',
        [Language.VI]: 'Tạo kế hoạch ăn uống thất bại',
      },
      body: {
        [Language.EN]: 'Please try generating again in a moment.',
        [Language.VI]: 'Vui lòng thử tạo lại sau ít phút.',
      },
    },
    [GenerationType.INBODY]: {
      title: {
        [Language.EN]: 'InBody scan failed',
        [Language.VI]: 'Phân tích InBody thất bại',
      },
      body: {
        [Language.EN]: 'Upload the scan again so we can finish the analysis.',
        [Language.VI]: 'Tải lại báo cáo để chúng tôi tiếp tục phân tích.',
      },
    },
    [GenerationType.BODY_PHOTO]: {
      title: {
        [Language.EN]: 'Body analysis failed',
        [Language.VI]: 'Phân tích ảnh cơ thể thất bại',
      },
      body: {
        [Language.EN]: 'Please try uploading another photo.',
        [Language.VI]: 'Vui lòng thử tải lên ảnh khác.',
      },
    },
  },
};

@Injectable()
export class NotificationFacade {
  private messaging: Messaging | null = null;
  private firebaseApp: App | null = null;
  private readonly logger = new Logger(NotificationFacade.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {
    this.initializeFirebase();
  }
  async notifyGenerationComplete(payload: GenerationNotificationPayload): Promise<void> {
    await this.sendGenerationNotification('complete', payload);
  }
  async notifyGenerationError(payload: GenerationNotificationPayload): Promise<void> {
    await this.sendGenerationNotification('error', payload);
  }
  private async sendGenerationNotification(
    category: NotificationCategory,
    payload: GenerationNotificationPayload,
  ): Promise<void> {
    if (!this.messaging) {
      this.logger.warn('FCM is not configured; generation notification skipped');
      return;
    }
    const tokens: string[] = await this.fetchDeviceTokens(payload.userId);
    if (tokens.length === 0) {
      this.logger.debug(`No device tokens for user ${payload.userId}; skipping notification`);
      return;
    }
    const user = await this.userRepository.findById(payload.userId);
    const language = this.resolveLanguage(user?.language);
    const message = this.resolveMessage(category, payload.generationType, language);

    const data: Record<string, string> = {
      notificationCategory: category,
      generationType: payload.generationType,
      jobId: payload.jobId.toString(),
    };

    if (payload.planId) {
      data.planId = payload.planId;
    }
    if (payload.resultId) {
      data.resultId = payload.resultId;
    }
    if (payload.error) {
      data.error = payload.error;
    }
    await this.sendMulticast(
      tokens,
      {
        title: message.title,
        body: message.body,
      },
      data,
    );
  }
  private async sendMulticast(
    tokens: string[],
    notification: { title: string; body: string },
    data: Record<string, string>,
  ): Promise<void> {
    if (!this.messaging) {
      return;
    }
    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      try {
        await this.messaging.sendEachForMulticast({
          tokens: chunk,
          notification,
          data,
        });
      } catch (error) {
        this.logger.error('Failed to send FCM notification', error);
      }
    }
  }
  private resolveMessage(
    category: NotificationCategory,
    generationType: GenerationType,
    language: Language,
  ): { title: string; body: string } {
    const fallbackLanguage = Language.VI;
    const content = generationMessages[category][generationType];
    return {
      title: content.title[language] || content.title[fallbackLanguage],
      body: content.body[language] || content.body[fallbackLanguage],
    };
  }
  private resolveLanguage(language?: Language | string): Language {
    if (language && Object.values(Language).includes(language as Language)) {
      return language as Language;
    }
    return Language.VI;
  }
  private async fetchDeviceTokens(userId: string): Promise<string[]> {
    const tokens = await this.deviceTokenRepository.findByUser(userId);
    return tokens
      .map((record) => record.token)
      .filter((token): token is string => typeof token === 'string' && token.length > 0);
  }
  private initializeFirebase(): void {
    if (this.messaging) {
      return;
    }
    const projectId = this.configService.get<string>('firebase.projectId') || '';
    const clientEmail = this.configService.get<string>('firebase.clientEmail') || '';
    const privateKey = this.configService.get<string>('firebase.privateKey') || '';

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials are missing; notifications are disabled.');
      return;
    }
    try {
      const existingApp = getApps().find((app) => app.name === NOTIFICATION_APP_NAME);
      this.firebaseApp =
        existingApp ||
        initializeApp(
          {
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          },
          NOTIFICATION_APP_NAME,
        );
      this.messaging = getMessaging(this.firebaseApp);
      this.logger.log('Firebase messaging initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase messaging', error);
      this.messaging = null;
      this.firebaseApp = null;
    }
  }
}
