import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InbodyResultRepository } from '../../repositories/inbody-result.repository';
import { InbodyStatus } from '../../common/enums';
import { InbodyService } from './inbody.service';
import { InbodySourceType } from 'src/repositories/schemas/inbody-result.schema';

@Injectable()
export class InbodyCronService {
  private readonly logger = new Logger(InbodyCronService.name);

  constructor(
    private readonly inbodyResultRepository: InbodyResultRepository,
    private readonly inbodyService: InbodyService,
  ) {}
  /**
   * Run daily at 2 AM to retry processing stuck InBody results
   * Results that have been in PROCESSING status for more than 1 hour
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async retryStuckInbodyResults(): Promise<void> {
    this.logger.log('Starting daily retry of stuck InBody results...');

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Find all results that are still PROCESSING and were created/updated more than 1 hour ago
      const stuckResults = await this.inbodyResultRepository.baseModel
        .find({
          status: InbodyStatus.PROCESSING,
          $or: [{ updatedAt: { $lt: oneHourAgo } }, { createdAt: { $lt: oneHourAgo } }],
        })
        .lean()
        .exec();

      if (stuckResults.length === 0) {
        this.logger.log('No stuck InBody results found');
        return;
      }
      this.logger.log(`Found ${stuckResults.length} stuck InBody result(s) to retry`);

      for (const result of stuckResults) {
        try {
          this.logger.log(
            `Retrying InBody result ${result._id} (sourceType: ${result.sourceType})`,
          );

          if (
            result.sourceType === InbodySourceType.BODY_PHOTO ||
            result.sourceType === InbodySourceType.INBODY_SCAN
          ) {
            // Retry body photo analysis
            if (result.s3Url) {
              await this.inbodyService['processBodyPhotoAnalysis'](
                result._id!.toString(),
                result.s3Url,
                result.userId,
              );
            } else {
              this.logger.warn(`Result ${result._id} missing s3Url, marking as FAILED`);
              await this.inbodyResultRepository.update(result._id!.toString(), {
                status: InbodyStatus.FAILED,
                errorMessage: 'Missing image URL for retry',
              });
            }
          } else {
            // Retry InBody scan analysis
            if (result.ocrText) {
              await this.inbodyService['processAiAnalysis'](
                result._id!.toString(),
                result.ocrText,
                result.metrics || {},
              );
            } else {
              this.logger.warn(`Result ${result._id} missing ocrText, marking as FAILED`);
              await this.inbodyResultRepository.update(result._id!.toString(), {
                status: InbodyStatus.FAILED,
                errorMessage: 'Missing OCR text for retry',
              });
            }
          }
        } catch (error) {
          this.logger.error(`Failed to retry result ${result._id}:`, error);
          // Mark as failed if retry also fails
          await this.inbodyResultRepository.update(result._id!.toString(), {
            status: InbodyStatus.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Retry failed',
          });
        }
      }
      this.logger.log(`Completed retry of ${stuckResults.length} InBody result(s)`);
    } catch (error) {
      this.logger.error('Error in retryStuckInbodyResults cron job:', error);
    }
  }
}
