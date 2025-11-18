import { Module } from '@nestjs/common';
import { NotificationFacade } from './notification.facade';
import { RepositoryModule } from '../../repositories/repository.module';

@Module({
  imports: [RepositoryModule],
  providers: [NotificationFacade],
  exports: [NotificationFacade],
})
export class NotificationModule {}
