import { Module } from '@nestjs/common';
import { RepositoryModule } from '../../repositories/repository.module';
import { AIModule } from '../ai/ai.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { InbodyCronService } from './inbody-cron.service';
import { InbodyController } from './inbody.controller';
import { InbodyService } from './inbody.service';
import { S3Service } from './s3.service';

@Module({
  imports: [RepositoryModule, UserModule, AIModule, NotificationModule],
  providers: [InbodyService, S3Service, InbodyCronService],
  controllers: [InbodyController],
  exports: [InbodyService, S3Service],
})
export class InbodyModule {}
