import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QueueName, JobName, JobConcurrency } from '../../../common/enums';
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
  @Process({
    name: JobName.PROCESS_INBODY_REPORT,
    concurrency: JobConcurrency[QueueName.INBODY_OCR], // Process up to 5 jobs concurrently (OCR is faster)
  })
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
      job.id,
    );

    this.logger.log(`Finished InBody analysis job ${job.id} for user ${userId}`);

    return { userId };
  }
}
