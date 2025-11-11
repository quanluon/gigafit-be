import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExerciseRepository } from '../../repositories';
import { VideoSource, MuscleGroup } from '../../repositories/schemas/exercise.schema';

interface TikTokVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  author: {
    username: string;
    nickname: string;
  };
  statistics: {
    play_count: number;
    like_count: number;
    share_count: number;
  };
  duration: number;
  create_time: number;
  cover_url: string;
}

@Injectable()
export class TikTokCrawlerService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.tiktok.com/v1';
  private readonly logger = new Logger(TikTokCrawlerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly exerciseRepository: ExerciseRepository,
  ) {
    this.apiKey = this.configService.get<string>('crawler.tiktok.apiKey') || '';
  }

  /**
   * Crawl fitness exercises from TikTok
   */
  async crawlExercisesByMuscleGroup(
    muscleGroup: MuscleGroup,
    maxResults: number = 10,
  ): Promise<number> {
    const hashtags = this.getHashtags(muscleGroup);
    let totalCrawled = 0;

    for (const hashtag of hashtags) {
      try {
        const videos = await this.searchVideosByHashtag(hashtag, maxResults);

        for (const video of videos) {
          await this.saveExercise(video, muscleGroup);
          totalCrawled++;
        }

        this.logger.log(`Crawled ${videos.length} TikTok videos for #${hashtag}`);
      } catch (error) {
        this.logger.error(`Failed to crawl TikTok hashtag #${hashtag}:`, error);
      }
    }

    return totalCrawled;
  }

  /**
   * Search TikTok videos by hashtag
   * Note: This is a placeholder implementation
   * TikTok's official API has limited public access
   */
  private async searchVideosByHashtag(hashtag: string, maxResults: number): Promise<TikTokVideo[]> {
    // IMPORTANT: TikTok API requires approval and has limited access
    // For production, you may need to:
    // 1. Apply for TikTok Developer account
    // 2. Use unofficial APIs (not recommended for production)
    // 3. Use web scraping (check TikTok's ToS)

    if (!this.apiKey) {
      this.logger.warn('TikTok API key not configured. Skipping TikTok crawling.');
      return [];
    }

    try {
      // This is a placeholder - actual endpoint depends on TikTok API version
      const response = await axios.get(`${this.baseUrl}/hashtag/videos`, {
        params: {
          access_token: this.apiKey,
          hashtag_name: hashtag,
          count: maxResults,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.data.videos || [];
    } catch (error) {
      this.logger.error(`TikTok API call failed:`, error);
      return [];
    }
  }

  /**
   * Save TikTok exercise to database
   */
  private async saveExercise(video: TikTokVideo, muscleGroup: MuscleGroup): Promise<void> {
    const videoUrl = video.video_url;

    // Check if already exists
    const existing = await this.exerciseRepository.findOne({ videoUrl });
    if (existing) {
      this.logger.debug(`Exercise already exists: ${video.title}`);
      return;
    }

    // Extract exercise name
    const { en, vi } = this.extractExerciseName(video.title);

    // Generate keywords
    const keywords = this.generateKeywords(video.title, video.description);

    await this.exerciseRepository.create({
      name: { en, vi },
      keywords,
      videoUrl,
      source: VideoSource.TIKTOK,
      muscleGroups: [muscleGroup],
      metadata: {
        title: video.title,
        description: video.description,
        channelName: video.author.nickname,
        duration: video.duration,
        viewCount: video.statistics.play_count,
        likeCount: video.statistics.like_count,
        publishedAt: new Date(video.create_time * 1000),
      },
      thumbnailUrl: video.cover_url,
      lastCrawledAt: new Date(),
      isActive: true,
      usageCount: 0,
    });

    this.logger.log(`Saved TikTok exercise: ${en}`);
  }

  /**
   * Extract exercise name from title
   */
  private extractExerciseName(title: string): { en: string; vi: string } {
    // Clean up TikTok-style titles
    const cleanTitle = title
      .replace(/#\w+/g, '') // Remove hashtags
      .replace(/[🔥💪🏋️‍♀️💯⚡]/g, '') // Remove emojis
      .replace(/\d+/g, '') // Remove numbers
      .trim();

    // Take first meaningful part
    const parts = cleanTitle.split(/[|•·]/);
    const en = parts[0].trim().substring(0, 100); // Limit length

    // TODO: Add translation service
    const vi = en;

    return { en, vi };
  }

  /**
   * Generate keywords from title and description
   */
  private generateKeywords(title: string, description: string): string[] {
    const text = `${title} ${description}`.toLowerCase();
    const keywords: string[] = [];

    // Extract hashtags
    const hashtags = text.match(/#(\w+)/g);
    if (hashtags) {
      keywords.push(...hashtags.map((h) => h.replace('#', '')));
    }

    // Extract words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'for', 'with', 'this', 'that'];
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.includes(w));

    keywords.push(...words);

    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Get hashtags for each muscle group
   */
  private getHashtags(muscleGroup: MuscleGroup): string[] {
    const hashtags: Record<MuscleGroup, string[]> = {
      [MuscleGroup.CHEST]: ['chestworkout', 'benchpress', 'chestday'],
      [MuscleGroup.BACK]: ['backworkout', 'deadlift', 'pullups', 'backday'],
      [MuscleGroup.LEGS]: ['legworkout', 'legday', 'squats'],
      [MuscleGroup.SHOULDERS]: ['shoulderworkout', 'shoulderday'],
      [MuscleGroup.ARMS]: ['armworkout', 'biceps', 'triceps'],
      [MuscleGroup.CORE]: ['abs', 'coreworkout', 'absworkout'],
      [MuscleGroup.CARDIO]: ['cardio', 'hiit', 'cardioworkout'],
      [MuscleGroup.FULL_BODY]: ['fullbodyworkout', 'workout', 'fitness'],
    };

    return hashtags[muscleGroup] || [];
  }

  /**
   * Crawl all muscle groups from TikTok
   */
  async crawlAll(videosPerGroup: number = 5): Promise<number> {
    if (!this.apiKey) {
      this.logger.warn('TikTok API key not configured. Skipping TikTok crawling.');
      return 0;
    }

    const muscleGroups = Object.values(MuscleGroup);
    let totalCrawled = 0;

    for (const group of muscleGroups) {
      this.logger.log(`Crawling ${group} exercises from TikTok...`);
      const count = await this.crawlExercisesByMuscleGroup(group, videosPerGroup);
      totalCrawled += count;

      // Delay to respect rate limits
      await this.delay(3000);
    }

    this.logger.log(`Total TikTok exercises crawled: ${totalCrawled}`);
    return totalCrawled;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
