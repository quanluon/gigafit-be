import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SubscriptionService } from './services/subscription.service';
import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  controllers: [UserController],
  providers: [UserService, SubscriptionService, SubscriptionGuard],
  exports: [UserService, SubscriptionService, SubscriptionGuard],
})
export class UserModule {}
