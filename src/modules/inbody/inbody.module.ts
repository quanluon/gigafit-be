import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InbodyResult, InbodyResultSchema } from '../../repositories';
import { InbodyService } from './inbody.service';
import { InbodyController } from './inbody.controller';
import { S3Service } from './s3.service';
import { RepositoryModule } from '../../repositories/repository.module';
import { UserModule } from '../user/user.module';
import { AIModule } from '../ai/ai.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    RepositoryModule,
    UserModule,
    AIModule,
    NotificationModule,
    MongooseModule.forFeature([{ name: InbodyResult.name, schema: InbodyResultSchema }]),
  ],
  providers: [InbodyService, S3Service],
  controllers: [InbodyController],
  exports: [InbodyService, S3Service],
})
export class InbodyModule {}
