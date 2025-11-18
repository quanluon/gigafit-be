import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InbodyResultRepository } from '../../repositories/inbody-result.repository';
import { InbodyResult, InbodySourceType } from '../../repositories/schemas/inbody-result.schema';
import { GenerationType, InbodyStatus } from '../../common/enums';
import { SubscriptionService } from '../user/services/subscription.service';
import { InbodyMetricsSummary, InbodyAnalysis } from '../../common/interfaces';
import { AIService } from '../ai/ai.service';
import { NotificationFacade } from '../notification/notification.facade';

@Injectable()
export class InbodyService {
  private readonly logger = new Logger(InbodyService.name);

  constructor(
    private readonly inbodyResultRepository: InbodyResultRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly aiService: AIService,
    private readonly notificationFacade: NotificationFacade,
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
      const scanResult = await this.aiService.analyzeInbodyImage(s3Url, previousResult);

      // Increment usage after successful scan (maintain historical behavior)
      await this.subscriptionService.incrementAIGenerationUsage(userId, GenerationType.INBODY);

      return scanResult;
    } catch (error) {
      this.logger.error('Failed to scan InBody image', error);
      await this.subscriptionService.decrementAIGenerationUsage(userId, GenerationType.INBODY);
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
    jobId?: string | number,
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
    this.processAiAnalysis(result._id!.toString(), ocrText, metrics || {}, jobId).catch((error) => {
      this.logger.error('Failed to process analysis', error);
    });

    return result;
  }
  async processAiAnalysis(
    resultId: string,
    ocrText: string,
    metrics: InbodyMetricsSummary,
    jobId?: string | number,
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
        await this.notificationFacade.notifyGenerationComplete({
          userId: result.userId,
          jobId: jobId || resultId,
          generationType: GenerationType.INBODY,
          resultId,
        });
      }
    } catch (error) {
      this.logger.error('Analysis failed', error);
      await this.inbodyResultRepository.update(resultId, {
        status: InbodyStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      const result = await this.inbodyResultRepository.findById(resultId);
      if (result) {
        await this.notificationFacade.notifyGenerationError({
          userId: result.userId,
          jobId: jobId || resultId,
          generationType: GenerationType.INBODY,
          resultId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
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
    jobId?: string | number,
  ): Promise<void> {
    try {
      // Use AI vision to estimate body composition from photo
      const metrics = await this.aiService.analyzeBodyPhoto(imageUrl);

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

      await this.notificationFacade.notifyGenerationComplete({
        userId,
        jobId: jobId || resultId,
        generationType: GenerationType.BODY_PHOTO,
        resultId,
      });
    } catch (error) {
      this.logger.error('Body photo analysis failed', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.inbodyResultRepository.update(resultId, {
        status: InbodyStatus.FAILED,
        errorMessage,
      });

      // Decrement usage on error
      await this.subscriptionService.decrementAIGenerationUsage(userId, GenerationType.BODY_PHOTO);

      await this.notificationFacade.notifyGenerationError({
        userId,
        jobId: jobId || resultId,
        generationType: GenerationType.BODY_PHOTO,
        resultId,
        error: errorMessage,
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
