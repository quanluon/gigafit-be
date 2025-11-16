import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InbodyResultRepository } from '../../repositories/inbody-result.repository';
import { InbodyResult } from '../../repositories/schemas/inbody-result.schema';
import { GenerationType, InbodyStatus, WebSocketEvent, WebSocketRoom } from '../../common/enums';
import { SubscriptionService } from '../user/services/subscription.service';
import { InbodyMetricsSummary, Translatable } from '../../common/interfaces';
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
          message: 'Starting InBody image analysis...',
        });

      // Emit progress: analyzing image
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_PROGRESS, {
          progress: 30,
          message: 'Analyzing image with AI...',
        });

      // Use AI vision to analyze the image
      const result = await this.aiService.analyzeInbodyImage(s3Url);

      // Emit progress: extracting metrics
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_PROGRESS, {
          progress: 80,
          message: 'Extracting body metrics...',
        });

      // Increment usage after successful scan
      await this.subscriptionService.incrementAIGenerationUsage(userId, GenerationType.INBODY);

      // Emit completion
      this.notificationGateway.server
        .to(`${WebSocketRoom.USER_PREFIX}${userId}`)
        .emit(WebSocketEvent.INBODY_SCAN_COMPLETE, {
          message: 'InBody scan completed successfully!',
        });

      return result;
    } catch (error) {
      this.logger.error('Failed to scan InBody image with AI vision', error);
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
      s3Url,
      originalFilename,
      ocrText: ocrText.trim(),
      metrics,
      takenAt: takenAt || new Date(),
    });

    // Process AI analysis asynchronously
    this.processAiAnalysis(result._id!.toString(), ocrText, metrics || {}).catch((error) => {
      this.logger.error('Failed to process AI analysis', error);
    });

    return result;
  }

  private async processAiAnalysis(
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
      this.logger.error('AI analysis failed', error);
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

  private async generateAiAnalysis(
    metrics: InbodyMetricsSummary,
    ocrText: string,
  ): Promise<Translatable> {
    try {
      return await this.aiService.generateInbodyAnalysis(metrics, ocrText);
    } catch (error) {
      this.logger.error('Failed to generate AI analysis for InBody result', error);
      return {
        en: 'Unable to generate AI insights at this time.',
        vi: 'Không thể tạo thông tin chi tiết AI vào lúc này.',
      };
    }
  }
}
