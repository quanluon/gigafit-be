import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from 'src/common';
import { BaseController } from '../../common/base';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SendTestNotificationDto,
  TestNotificationCategory,
} from './dto/send-test-notification.dto';
import { NotificationFacade } from './notification.facade';

// interface RequestWithUser extends Request {
//   user: { userId: string };
// }

@ApiTags('notification')
@Controller('notification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController extends BaseController {
  constructor(private readonly notificationFacade: NotificationFacade) {
    super();
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test push notification to the current user' })
  async sendTestNotification(
    // @Req() req: RequestWithUser,
    @Body() dto: SendTestNotificationDto,
  ): Promise<ApiResponse<null>> {
    const payload = {
      userId: '6912e0c998f5a497cffb44ee',
      // userId: req.user.userId,
      jobId: `test-${Date.now()}`,
      generationType: dto.generationType,
      planId: dto.planId,
      resultId: dto.resultId,
    };

    if (dto.category === TestNotificationCategory.ERROR) {
      await this.notificationFacade.notifyGenerationError({
        ...payload,
        error: dto.errorMessage || 'Test error notification',
      });
    } else {
      await this.notificationFacade.notifyGenerationComplete(payload);
    }

    return this.success(null, 'Test notification dispatched');
  }
}
