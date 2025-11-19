import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RecommendationService } from './recommendation.service';
import { AwardListener } from './listeners/award.listener';
import { RepositoryModule } from '../../repositories/repository.module';
import { NotificationModule } from '../notification/notification.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [RepositoryModule, NotificationModule, AIModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RecommendationService, AwardListener],
  exports: [AnalyticsService, RecommendationService],
})
export class AnalyticsModule {}
