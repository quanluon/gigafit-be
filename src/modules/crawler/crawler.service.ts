import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { YouTubeCrawlerService } from './youtube-crawler.service';
import { TikTokCrawlerService } from './tiktok-crawler.service';
import { ExerciseRepository } from '../../repositories';
import { MuscleGroup, VideoSource } from '../../repositories/schemas/exercise.schema';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private readonly youtubeCrawler: YouTubeCrawlerService,
    private readonly tiktokCrawler: TikTokCrawlerService,
    private readonly exerciseRepository: ExerciseRepository,
  ) {}

  /**
   * Crawl exercises from all sources
   */
  async crawlAllSources(videosPerGroup: number = 5): Promise<{
    youtube: number;
    tiktok: number;
    total: number;
  }> {
    this.logger.log('Starting exercise crawling from all sources...');

    const [youtubeCount, tiktokCount] = await Promise.all([
      this.youtubeCrawler.crawlAll(videosPerGroup),
      this.tiktokCrawler.crawlAll(videosPerGroup),
    ]);

    const total = youtubeCount + tiktokCount;

    this.logger.log(
      `Crawling complete! YouTube: ${youtubeCount}, TikTok: ${tiktokCount}, Total: ${total}`,
    );

    return {
      youtube: youtubeCount,
      tiktok: tiktokCount,
      total,
    };
  }

  /**
   * Crawl specific muscle group
   */
  async crawlMuscleGroup(
    muscleGroup: MuscleGroup,
    videosPerSource: number = 5,
  ): Promise<{
    youtube: number;
    tiktok: number;
    total: number;
  }> {
    this.logger.log(`Crawling ${muscleGroup} exercises...`);

    const [youtubeCount, tiktokCount] = await Promise.all([
      this.youtubeCrawler.crawlExercisesByMuscleGroup(muscleGroup, videosPerSource),
      this.tiktokCrawler.crawlExercisesByMuscleGroup(muscleGroup, videosPerSource),
    ]);

    const total = youtubeCount + tiktokCount;

    this.logger.log(
      `${muscleGroup} crawling complete! YouTube: ${youtubeCount}, TikTok: ${tiktokCount}`,
    );

    return {
      youtube: youtubeCount,
      tiktok: tiktokCount,
      total,
    };
  }

  /**
   * Get exercise statistics
   */
  async getStatistics(): Promise<{
    total: number;
    bySource: Record<VideoSource, number>;
    byMuscleGroup: Record<MuscleGroup, number>;
    mostPopular: Array<{ name: string; usageCount: number }>;
  }> {
    const [total, youtube, tiktok, manual] = await Promise.all([
      this.exerciseRepository.count({ isActive: true }),
      this.exerciseRepository.count({ isActive: true, source: VideoSource.YOUTUBE }),
      this.exerciseRepository.count({ isActive: true, source: VideoSource.TIKTOK }),
      this.exerciseRepository.count({ isActive: true, source: VideoSource.MANUAL }),
    ]);

    const bySource = {
      [VideoSource.YOUTUBE]: youtube,
      [VideoSource.TIKTOK]: tiktok,
      [VideoSource.MANUAL]: manual,
    };

    // Get counts by muscle group
    const muscleGroups = Object.values(MuscleGroup);
    const byMuscleGroup: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;

    for (const group of muscleGroups) {
      const count = await this.exerciseRepository.count({
        isActive: true,
        muscleGroups: group,
      });
      byMuscleGroup[group] = count;
    }

    // Get most popular exercises
    const popularExercises = await this.exerciseRepository.findMostPopular(10);
    const mostPopular = popularExercises.map((ex) => ({
      name: ex.name.en,
      usageCount: ex.usageCount,
    }));

    return {
      total,
      bySource,
      byMuscleGroup,
      mostPopular,
    };
  }

  /**
   * Scheduled job: Crawl exercises weekly
   * Runs every Sunday at 2 AM
   */
  @Cron(CronExpression.EVERY_WEEK)
  async scheduledCrawl(): Promise<void> {
    this.logger.log('Running scheduled exercise crawl...');

    try {
      const result = await this.crawlAllSources(3); // 3 videos per group
      this.logger.log(`Scheduled crawl complete: ${result.total} new exercises`);
    } catch (error) {
      this.logger.error('Scheduled crawl failed:', error);
    }
  }

  /**
   * Refresh existing exercise metadata
   */
  async refreshMetadata(exerciseId: string): Promise<void> {
    const exercise = await this.exerciseRepository.findById(exerciseId);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    if (exercise.source === VideoSource.YOUTUBE) {
      // Re-fetch YouTube video details
      const videoId = this.extractYouTubeVideoId(exercise.videoUrl);
      if (videoId) {
        // Refresh metadata (implementation depends on YouTube API)
        this.logger.log(`Refreshing metadata for YouTube video: ${videoId}`);
      }
    }

    await this.exerciseRepository.updateMetadata(exerciseId, {
      lastCrawledAt: new Date(),
    });
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }
}
