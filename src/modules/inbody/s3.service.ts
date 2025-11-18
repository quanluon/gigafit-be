import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const awsConfig = this.configService.get('aws');
    this.bucket = awsConfig?.s3?.bucket || '';

    if (!this.bucket) {
      this.logger.warn('AWS S3 bucket not configured');
    }
    this.s3Client = new S3Client({
      region: awsConfig?.region || 'ap-southeast-1',
      credentials: awsConfig?.s3?.accessKeyId
        ? {
            accessKeyId: awsConfig.s3.accessKeyId,
            secretAccessKey: awsConfig.s3.secretAccessKey,
          }
        : undefined,
    });
  }
  async generatePresignedUploadUrl(
    userId: string,
    filename: string,
  ): Promise<{
    uploadUrl: string;
    s3Url: string;
    key: string;
  }> {
    if (!this.bucket) {
      throw new Error('S3 bucket not configured');
    }
    const sanitizedName = filename.replace(/\s+/g, '_');
    const key = `inbody/${userId}/${Date.now()}-${randomUUID()}-${sanitizedName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: 'image/*',
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour
    const s3Url = this.getS3Url(key);

    return { uploadUrl, s3Url, key };
  }
  getS3Url(key: string): string {
    if (!this.bucket) {
      throw new Error('S3 bucket not configured');
    }
    const awsConfig = this.configService.get('aws');
    const region = awsConfig?.region || 'ap-southeast-1';
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }
  extractKeyFromUrl(url: string): string {
    const match = url.match(/\/inbody\/.+$/);
    return match ? match[0] : '';
  }
}
