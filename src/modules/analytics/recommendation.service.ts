import { Injectable, Logger } from '@nestjs/common';
import {
  UserRepository,
  WeightLogRepository,
  TrainingSessionRepository,
  InbodyResultRepository,
} from '../../repositories';
import { NotificationFacade } from '../notification/notification.facade';
import { SessionStatus, InbodyStatus, Language } from '../../common/enums';
import { InbodySourceType } from '../../repositories/schemas/inbody-result.schema';
import { AIService } from '../ai/ai.service';

interface RecommendationData {
  weightChange7Days?: number;
  weightSeries7Days?: number[];
  totalWeightLogs: number;
  recentSessions: number;
  totalCalories: number;
  latestInbody?: {
    weight?: number;
    bodyFatPercent?: number;
    skeletalMuscleMass?: number;
  };
  isFirstPlan?: boolean;
  userLanguage: Language;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly weightLogRepository: WeightLogRepository,
    private readonly trainingSessionRepository: TrainingSessionRepository,
    private readonly inbodyResultRepository: InbodyResultRepository,
    private readonly notificationFacade: NotificationFacade,
    private readonly aiService: AIService,
  ) {}

  async generateRecommendation(
    userId: string,
    context: { isFirstPlan?: boolean } = {},
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.warn(`User ${userId} not found for recommendation generation`);
        return;
      }

      const data = await this.collectRecommendationData(userId, context);
      const language = data.userLanguage === Language.VI ? 'vi' : 'en';
      const recommendation = await this.aiService.generateTrainingRecommendation(data, language);

      await this.userRepository.update(userId, {
        trainingRecommendation: {
          generatedAt: new Date(),
          title: recommendation.title,
          summary: recommendation.summary,
          metrics: recommendation.metrics,
          ...(recommendation.cta && { cta: recommendation.cta }),
        },
      });

      await this.sendRecommendationNotification(userId);

      this.logger.log(`Generated recommendation for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to generate recommendation for user ${userId}:`, error);
    }
  }

  private async collectRecommendationData(
    userId: string,
    context: { isFirstPlan?: boolean },
  ): Promise<RecommendationData> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const weightLogs = await this.weightLogRepository.findByUser(userId, 30);
    const totalWeightLogs = weightLogs.length;

    let weightChange7Days: number | undefined;
    let weightSeries7Days: number[] | undefined;
    if (weightLogs.length >= 2) {
      const recentSortedAsc = [...weightLogs]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-7);

      if (recentSortedAsc.length > 0) {
        weightSeries7Days = recentSortedAsc.map((log) => log.weight);
      }

      if (recentSortedAsc.length >= 2) {
        const first = recentSortedAsc[0].weight;
        const last = recentSortedAsc[recentSortedAsc.length - 1].weight;
        weightChange7Days = last - first;
      }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSessions = await this.trainingSessionRepository.find({
      userId,
      status: SessionStatus.COMPLETED,
      createdAt: { $gte: sevenDaysAgo },
    });

    const totalCalories = recentSessions.reduce(
      (sum, session) => sum + (session.totalCalories || 0),
      0,
    );

    const latestInbody = await this.inbodyResultRepository.baseModel
      .findOne({
        userId,
        status: InbodyStatus.COMPLETED,
        sourceType: InbodySourceType.INBODY_SCAN,
        metrics: { $exists: true, $ne: null },
      })
      .sort({ takenAt: -1, createdAt: -1 })
      .lean()
      .exec();

    return {
      weightChange7Days,
      totalWeightLogs,
      recentSessions: recentSessions.length,
      totalCalories,
      latestInbody: latestInbody?.metrics
        ? {
            weight: latestInbody.metrics.weight,
            bodyFatPercent: latestInbody.metrics.bodyFatPercent,
            skeletalMuscleMass: latestInbody.metrics.skeletalMuscleMass,
          }
        : undefined,
      weightSeries7Days,
      isFirstPlan: context.isFirstPlan,
      userLanguage: user.language || Language.EN,
    };
  }

  async shouldGenerateRecommendation(
    userId: string,
    trigger: 'weight' | 'inbody' | 'plan',
  ): Promise<boolean> {
    if (trigger === 'plan') {
      const user = await this.userRepository.findById(userId);
      return (
        !user?.trainingRecommendation ||
        user.trainingRecommendation.generatedAt < new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
    }

    if (trigger === 'weight') {
      const weightLogs = await this.weightLogRepository.findByUser(userId, 100);
      const totalLogs = weightLogs.length;
      return totalLogs > 0 && totalLogs % 7 === 0;
    }

    if (trigger === 'inbody') {
      const inbodyResults = await this.inbodyResultRepository.baseModel
        .find({
          userId,
          status: InbodyStatus.COMPLETED,
          sourceType: InbodySourceType.INBODY_SCAN,
        })
        .sort({ createdAt: 1 })
        .lean()
        .exec();
      const completedCount = inbodyResults.length;
      return completedCount > 0 && completedCount % 2 === 0;
    }

    return false;
  }

  private async sendRecommendationNotification(userId: string): Promise<void> {
    try {
      await this.notificationFacade.sendCustomNotification(
        userId,
        {
          [Language.EN]: 'Training analysis available',
          [Language.VI]: 'Đã có phân tích kết quả tập luyện thời gian qua',
        },
        {
          [Language.EN]: 'Open the app to view recommendations and insights from your trainer.',
          [Language.VI]: 'Mở ứng dụng để xem gợi ý và đánh giá từ chuyên gia.',
        },
        {
          notificationCategory: 'recommendation',
          type: 'training_analysis',
        },
      );
    } catch (error) {
      this.logger.error(`Failed to send recommendation notification for user ${userId}:`, error);
    }
  }
}
