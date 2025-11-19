import { Module, forwardRef } from '@nestjs/common';
import { RepositoryModule } from '../../repositories/repository.module';
import { AIModule } from '../ai/ai.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { InbodyCronService } from './inbody-cron.service';
import { InbodyController } from './inbody.controller';
import { InbodyService } from './inbody.service';
import { S3Service } from './s3.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    RepositoryModule,
    UserModule,
    AIModule,
    NotificationModule,
    forwardRef(() => QueueModule),
    forwardRef(() => AnalyticsModule),
  ],
  providers: [InbodyService, S3Service, InbodyCronService],
  controllers: [InbodyController],
  exports: [InbodyService, S3Service],
})
export class InbodyModule {}
