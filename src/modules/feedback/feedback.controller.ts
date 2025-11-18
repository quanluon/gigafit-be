import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController extends BaseController {
  constructor(private readonly feedbackService: FeedbackService) {
    super();
  }
  @Post()
  @ApiOperation({ summary: 'Submit beta feedback' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  async submitFeedback(
    @Body() createFeedbackDto: CreateFeedbackDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('accept-language') acceptLanguage?: string,
    @Headers('x-app-version') appVersionHeader?: string,
    @Ip() ipAddress?: string,
  ): Promise<ApiResponseType<{ id: string }>> {
    const feedback = await this.feedbackService.submitFeedback(createFeedbackDto, {
      userAgent,
      ipAddress,
      locale: acceptLanguage?.split(',')[0],
      appVersion: appVersionHeader,
    });

    return this.success({ id: feedback.id }, 'Feedback submitted successfully');
  }
}
