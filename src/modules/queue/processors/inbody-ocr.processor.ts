import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueName, JobName } from '../../../common/enums';
import { InbodyService } from '../../inbody/inbody.service';

export interface InbodyOcrJobData {
  userId: string;
  s3Url: string;
  originalFilename: string;
  takenAt?: string;
}

@Processor(QueueName.INBODY_OCR)
export class InbodyOcrProcessor {
  private readonly logger = new Logger(InbodyOcrProcessor.name);

  constructor(private readonly inbodyService: InbodyService) {}

  @Process(JobName.PROCESS_INBODY_REPORT)
  async handle(job: Job<InbodyOcrJobData>): Promise<{ userId: string }> {
    const { userId, s3Url, originalFilename, takenAt } = job.data;

    this.logger.log(`Processing InBody analysis job ${job.id} for user ${userId}`);

    const scanResult = await this.inbodyService.scanInbodyImage(
      userId,
      s3Url,
      originalFilename,
      takenAt ? new Date(takenAt) : undefined,
    );

    await this.inbodyService.processInbodyScan(
      userId,
      s3Url,
      originalFilename,
      scanResult.ocrText || JSON.stringify(scanResult.metrics || {}),
      scanResult.metrics,
      takenAt ? new Date(takenAt) : undefined,
    );

    this.logger.log(`Finished InBody analysis job ${job.id} for user ${userId}`);

    return { userId };
  }
}

