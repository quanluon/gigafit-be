import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AwardListener } from './listeners/award.listener';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AwardListener],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
