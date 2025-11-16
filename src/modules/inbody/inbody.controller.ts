import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { GenerationType } from '../../common/enums';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { InbodyResult } from '../../repositories/schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerationTypeDecorator, SubscriptionGuard } from '../user/guards/subscription.guard';
import { AnalyzeBodyPhotoDto } from './dto/analyze-body-photo.dto';
import { ProcessInbodyDto } from './dto/process-inbody.dto';
import { ScanInbodyDto } from './dto/scan-inbody.dto';
import { InbodyService } from './inbody.service';
import { S3Service } from './s3.service';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('inbody')
@Controller('inbody')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InbodyController extends BaseController {
  constructor(
    private readonly inbodyService: InbodyService,
    private readonly s3Service: S3Service,
  ) {
    super();
  }

  @Get()
  @ApiOperation({ summary: 'List InBody results' })
  async list(
    @Req() req: RequestWithUser,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ): Promise<ApiResponseType<InbodyResult[]>> {
    const results = await this.inbodyService.listUserResults(
      req.user.userId,
      Number(limit),
      Number(offset),
    );
    return this.success(results);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get InBody result detail' })
  async detail(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<ApiResponseType<InbodyResult>> {
    const result = await this.inbodyService.getResult(req.user.userId, id);
    return this.success(result);
  }

  @Post('presigned-url')
  @UseGuards(SubscriptionGuard)
  @GenerationTypeDecorator(GenerationType.INBODY)
  @ApiOperation({ summary: 'Get presigned URL for uploading InBody scan to S3' })
  async getPresignedUrl(
    @Req() req: RequestWithUser,
    @Body() body: { filename: string },
  ): Promise<ApiResponseType<{ uploadUrl: string; s3Url: string }>> {
    const { uploadUrl, s3Url } = await this.s3Service.generatePresignedUploadUrl(
      req.user.userId,
      body.filename,
    );
    return this.success({ uploadUrl, s3Url }, 'Presigned URL generated');
  }

  @Post('scan')
  @UseGuards(SubscriptionGuard)
  @GenerationTypeDecorator(GenerationType.INBODY)
  @ApiOperation({ summary: 'Scan InBody image using AI vision and return metrics as JSON' })
  async scan(
    @Req() req: RequestWithUser,
    @Body() dto: ScanInbodyDto,
  ): Promise<ApiResponseType<{ metrics: unknown; ocrText?: string }>> {
    const result = await this.inbodyService.scanInbodyImage(
      req.user.userId,
      dto.s3Url,
      dto.originalFilename,
      dto.takenAt ? new Date(dto.takenAt) : undefined,
    );
    return this.success(result, 'InBody image scanned successfully');
  }

  @Post('process')
  @UseGuards(SubscriptionGuard)
  @GenerationTypeDecorator(GenerationType.INBODY)
  @ApiOperation({ summary: 'Process InBody scan with OCR text from frontend' })
  async process(
    @Req() req: RequestWithUser,
    @Body() dto: ProcessInbodyDto,
  ): Promise<ApiResponseType<InbodyResult>> {
    const takenAt = dto.takenAt ? new Date(dto.takenAt) : undefined;
    const result = await this.inbodyService.processInbodyScan(
      req.user.userId,
      dto.s3Url,
      dto.originalFilename,
      dto.ocrText,
      dto.metrics,
      takenAt,
    );
    return this.success(result, 'InBody scan processed successfully');
  }

  @Post('body-photo')
  @ApiOperation({ summary: 'Analyze body photo to estimate body composition metrics' })
  async analyzeBodyPhoto(
    @Req() req: RequestWithUser,
    @Body() dto: AnalyzeBodyPhotoDto,
  ): Promise<ApiResponseType<InbodyResult>> {
    const takenAt = dto.takenAt ? new Date(dto.takenAt) : undefined;
    const result = await this.inbodyService.analyzeBodyPhoto(
      req.user.userId,
      dto.s3Url,
      dto.originalFilename,
      takenAt,
    );
    return this.success(result, 'Body photo analysis started');
  }
}
