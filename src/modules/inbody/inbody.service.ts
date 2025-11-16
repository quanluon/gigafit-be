import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InbodyResultRepository } from '../../repositories/inbody-result.repository';
import { InbodyResult, InbodySourceType } from '../../repositories/schemas/inbody-result.schema';
import { GenerationType, InbodyStatus, WebSocketEvent, WebSocketRoom } from '../../common/enums';
import { SubscriptionService } from '../user/services/subscription.service';
import { InbodyMetricsSummary, InbodyAnalysis } from '../../common/interfaces';
import { AIService } from '../ai/ai.service';
import { NotificationGateway } from '../notification/notification.gateway';

@Injectable()
export class InbodyService {
  private readonly logger = new Logger(InbodyService.name);

  constructor(
    private readonly inbodyResultRepository: InbodyResultRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly aiService: AIService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async listUserResults(userId: string, limit = 20, offset = 0): Promise<InbodyResult[]> {
    return this.inbodyResultRepository.baseModel
      .find({ userId })
      .sort({ takenAt: -1, createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean<InbodyResult[]>()
      .exec();
  }

  async getResult(userId: string, resultId: string): Promise<InbodyResult> {
    const result = await this.inbodyResultRepository.findById(resultId);
    if (!result || result.userId !== userId) {
      throw new BadRequestException('Result not found');
    }
    return result;
  }

  async scanInbodyImage(
    userId: string,
    s3Url: string,
    _originalFilename: string,
    _takenAt?: Date,
  ): Promise<{
    metrics: InbodyMetricsSummary;
    ocrText?: string;
  }> {
    const hasQuota = await this.subscriptionService.hasAvailableGenerations(
      userId,
      GenerationType.INBODY,
    );
    if (!hasQuota) {
      throw new BadRequestException('Subscription limit reached for InBody scans');
    }

    if (!s3Url) {
      throw new BadRequestException('S3 URL is required');
    }

    try {
      // Emit started event
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_STARTED, {
          progress: 0,
          message: 'Đang chuẩn bị phân tích...',
        });

      // Emit progress: analyzing image
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_PROGRESS, {
          progress: 20,
          message: 'Đang suy nghĩ về báo cáo InBody của bạn...',
        });

      // Emit progress: processing
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_PROGRESS, {
          progress: 40,
          message: 'Đang đọc và phân tích hình ảnh...',
        });

      // Find nearest previous InBody result with same source type for comparison
      const previousResult = await this.inbodyResultRepository.baseModel
        .findOne({
          userId,
          sourceType: InbodySourceType.INBODY_SCAN,
          status: InbodyStatus.COMPLETED,
          metrics: { $exists: true, $ne: null },
        })
        .sort({ takenAt: -1 })
        .lean<InbodyResult>()
        .exec();

      // Use AI vision to analyze the image with previous result for comparison
      const result = await this.aiService.analyzeInbodyImage(s3Url, previousResult);

      // Emit progress: extracting metrics
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_PROGRESS, {
          progress: 70,
          message: 'Đang trích xuất các chỉ số cơ thể...',
        });

      // Emit progress: finalizing
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_PROGRESS, {
          progress: 90,
          message: 'Đang hoàn thiện phân tích...',
        });

      // Increment usage after successful scan
      await this.subscriptionService.incrementAIGenerationUsage(userId, GenerationType.INBODY);

      // Emit completion
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_COMPLETE, {
          progress: 100,
          message: 'Hoàn thành phân tích InBody thành công!',
        });

      return result;
    } catch (error) {
      this.logger.error('Failed to scan InBody image', error);
      // Emit error event
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_ERROR, {
          message: error instanceof Error ? error.message : 'Failed to scan InBody image',
        });

      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to scan InBody image',
      );
    }
  }

  async processInbodyScan(
    userId: string,
    s3Url: string,
    originalFilename: string,
    ocrText: string,
    metrics?: InbodyMetricsSummary,
    takenAt?: Date,
  ): Promise<InbodyResult> {
    const hasQuota = await this.subscriptionService.hasAvailableGenerations(
      userId,
      GenerationType.INBODY,
    );
    if (!hasQuota) {
      throw new BadRequestException('Subscription limit reached for InBody scans');
    }

    if (!ocrText || !ocrText.trim()) {
      throw new BadRequestException('OCR text is required');
    }

    const result = await this.inbodyResultRepository.create({
      userId,
      status: InbodyStatus.PROCESSING,
      sourceType: InbodySourceType.INBODY_SCAN,
      s3Url,
      originalFilename,
      ocrText: ocrText.trim(),
      metrics,
      takenAt: takenAt || new Date(),
    });

    // Process analysis asynchronously
    this.processAiAnalysis(result._id!.toString(), ocrText, metrics || {}).catch((error) => {
      this.logger.error('Failed to process analysis', error);
    });

    return result;
  }

  async processAiAnalysis(
    resultId: string,
    ocrText: string,
    metrics: InbodyMetricsSummary,
  ): Promise<void> {
    try {
      const aiAnalysis = await this.generateAiAnalysis(metrics, ocrText);

      await this.inbodyResultRepository.update(resultId, {
        status: InbodyStatus.COMPLETED,
        aiAnalysis,
      });

      // Extract userId from result to increment usage
      const result = await this.inbodyResultRepository.findById(resultId);
      if (result) {
        await this.subscriptionService.incrementAIGenerationUsage(
          result.userId,
          GenerationType.INBODY,
        );
      }
    } catch (error) {
      this.logger.error('Analysis failed', error);
      await this.inbodyResultRepository.update(resultId, {
        status: InbodyStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  parseInbodyMetrics(ocrText: string): InbodyMetricsSummary {
    const extractNumber = (regex: RegExp): number | undefined => {
      const match = ocrText.match(regex);
      if (!match) return undefined;
      const value = parseFloat(match[1].replace(',', '.'));
      return Number.isNaN(value) ? undefined : value;
    };

    return {
      weight: extractNumber(/Trọng\s* lượng[^\d]*(\d{2,3}(?:[.,]\d)?)/i),
      skeletalMuscleMass: extractNumber(/Khối\s*lượng\s*cơ\s*xương[^\d]*(\d{1,3}(?:[.,]\d)?)/i),
      bodyFatMass: extractNumber(/Khối\s*lượng\s*mỡ\s*cơ\s*thể[^\d]*(\d{1,3}(?:[.,]\d)?)/i),
      bodyFatPercent: extractNumber(/PBF[^\d]*(\d{1,2}(?:[.,]\d)?)/i),
      bmi: extractNumber(/BMI[^\d]*(\d{1,2}(?:[.,]\d)?)/i),
      visceralFatLevel: extractNumber(/Mức\s*mỡ\s*nội\s*tạng[^\d]*(\d{1,2}(?:[.,]\d)?)/i),
      basalMetabolicRate: extractNumber(/TDEE[^\d]*(\d{3,4})/i),
    };
  }

  async analyzeBodyPhoto(
    userId: string,
    s3Url: string,
    originalFilename: string,
    takenAt?: Date,
  ): Promise<InbodyResult> {
    const hasQuota = await this.subscriptionService.hasAvailableGenerations(
      userId,
      GenerationType.BODY_PHOTO,
    );
    if (!hasQuota) {
      throw new BadRequestException('Subscription limit reached for body photo analysis');
    }

    if (!s3Url) {
      throw new BadRequestException('S3 URL is required');
    }

    // Create result with PROCESSING status
    const result = await this.inbodyResultRepository.create({
      userId,
      status: InbodyStatus.PROCESSING,
      sourceType: InbodySourceType.BODY_PHOTO,
      s3Url,
      originalFilename,
      takenAt: takenAt || new Date(),
    });

    // Process analysis asynchronously with socket notifications
    this.processBodyPhotoAnalysis(result._id!.toString(), s3Url, userId).catch((error) => {
      this.logger.error('Failed to process body photo analysis', error);
    });

    return result;
  }

  async processBodyPhotoAnalysis(
    resultId: string,
    imageUrl: string,
    userId: string,
  ): Promise<void> {
    try {
      // Emit started event
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.BODY_PHOTO_ANALYSIS_STARTED, {
          resultId,
          progress: 0,
          message: 'Đang chuẩn bị phân tích...',
        });

      // Emit progress: analyzing image
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.BODY_PHOTO_ANALYSIS_PROGRESS, {
          resultId,
          progress: 15,
          message: 'Đang suy nghĩ về hình ảnh cơ thể của bạn...',
        });

      // Emit progress: processing
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.BODY_PHOTO_ANALYSIS_PROGRESS, {
          resultId,
          progress: 35,
          message: 'Đang phân tích các chỉ số cơ thể...',
        });

      // Use AI vision to estimate body composition from photo
      const metrics = await this.aiService.analyzeBodyPhoto(imageUrl);

      // Emit progress: extracting metrics
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.BODY_PHOTO_ANALYSIS_PROGRESS, {
          resultId,
          progress: 60,
          message: 'Đang ước lượng % mỡ cơ thể và các chỉ số...',
        });

      // Emit progress: generating analysis
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.BODY_PHOTO_ANALYSIS_PROGRESS, {
          resultId,
          progress: 80,
          message: 'Đang tạo phân tích chi tiết...',
        });

      // Generate personalized analysis with estimated metrics
      const aiAnalysis = await this.generateAiAnalysis(metrics, '');

      // Update result with metrics and analysis
      await this.inbodyResultRepository.update(resultId, {
        status: InbodyStatus.COMPLETED,
        metrics,
        aiAnalysis,
      });

      // Increment usage after successful analysis
      await this.subscriptionService.incrementAIGenerationUsage(userId, GenerationType.BODY_PHOTO);

      // Emit completion event
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.BODY_PHOTO_ANALYSIS_COMPLETE, {
          resultId,
          progress: 100,
          message: 'Hoàn thành phân tích ảnh cơ thể thành công!',
        });
    } catch (error) {
      this.logger.error('Body photo analysis failed', error);
      await this.inbodyResultRepository.update(resultId, {
        status: InbodyStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Emit error event
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.BODY_PHOTO_ANALYSIS_ERROR, {
          resultId,
          message: error instanceof Error ? error.message : 'Failed to analyze body photo',
        });
    }
  }

  private async generateAiAnalysis(
    metrics: InbodyMetricsSummary,
    ocrText: string,
  ): Promise<InbodyAnalysis> {
    try {
      return await this.aiService.generateInbodyAnalysis(metrics, ocrText);
    } catch (error) {
      this.logger.error('Failed to generate analysis for InBody result', error);
      return {
        en: {
          body_composition_summary: 'Unable to generate personalized insights at this time.',
          recommendations: [],
          training_nutrition_advice: '',
        },
        vi: {
          body_composition_summary: 'Không thể tạo thông tin chi tiết cá nhân hóa vào lúc này.',
          recommendations: [],
          training_nutrition_advice: '',
        },
      };
    }
  }
}
