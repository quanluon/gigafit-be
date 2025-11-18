import { Module } from '@nestjs/common';
import { NotificationFacade } from './notification.facade';
import { RepositoryModule } from '../../repositories/repository.module';
import { NotificationController } from './notification.controller';

@Module({
  imports: [RepositoryModule],
  providers: [NotificationFacade],
  controllers: [NotificationController],
  exports: [NotificationFacade],
})
export class NotificationModule {}
