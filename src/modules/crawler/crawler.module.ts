import { Module } from '@nestjs/common';
import { YouTubeCrawlerService } from './youtube-crawler.service';
import { TikTokCrawlerService } from './tiktok-crawler.service';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { SeedExercisesService } from './seed-exercises.service';

@Module({
  controllers: [CrawlerController],
  providers: [CrawlerService, YouTubeCrawlerService, TikTokCrawlerService, SeedExercisesService],
  exports: [CrawlerService, YouTubeCrawlerService, TikTokCrawlerService, SeedExercisesService],
})
export class CrawlerModule {}
