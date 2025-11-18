import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExerciseRepository } from '../../repositories';
import { VideoSource, MuscleGroup } from '../../repositories/schemas/exercise.schema';

interface YouTubeSearchResult {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
}

interface YouTubeVideoDetails {
  id: string;
  contentDetails: {
    duration: string; // ISO 8601 format (e.g., "PT15M33S")
  };
  statistics: {
    viewCount: string;
    likeCount: string;
  };
}
@Injectable()
export class YouTubeCrawlerService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly logger = new Logger(YouTubeCrawlerService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly exerciseRepository: ExerciseRepository,
  ) {
    this.apiKey = this.configService.get<string>('crawler.youtube.apiKey') || '';
  }
  /**
   * Crawl exercises from YouTube by muscle group
   */
  async crawlExercisesByMuscleGroup(
    muscleGroup: MuscleGroup,
    maxResults: number = 10,
  ): Promise<number> {
    const searchQueries = this.getSearchQueries(muscleGroup);
    let totalCrawled = 0;

    for (const query of searchQueries) {
      try {
        const results = await this.searchVideos(query, maxResults);
        const videoIds = results.map((r) => r.id.videoId);

        // Get detailed video information
        const videoDetails = await this.getVideoDetails(videoIds);

        // Process and save each video
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const details = videoDetails[i];

          await this.saveExercise(result, details, muscleGroup);
          totalCrawled++;
        }
        this.logger.log(`Crawled ${results.length} videos for query: ${query}`);
      } catch (error) {
        this.logger.error(`Failed to crawl for query "${query}":`, error);
      }
    }
    return totalCrawled;
  }
  /**
   * Search YouTube videos
   */
  private async searchVideos(query: string, maxResults: number): Promise<YouTubeSearchResult[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          key: this.apiKey,
          q: query,
          part: 'snippet',
          type: 'video',
          maxResults,
          videoDuration: 'medium', // 4-20 minutes
          relevanceLanguage: 'en',
          order: 'relevance',
        },
      });

      return response.data.items || [];
    } catch (error) {
      this.logger.error(`YouTube search failed for "${query}":`, error);
      return [];
    }
  }
  /**
   * Get detailed video information
   */
  private async getVideoDetails(videoIds: string[]): Promise<YouTubeVideoDetails[]> {
    if (videoIds.length === 0) return [];

    try {
      const response = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          id: videoIds.join(','),
          part: 'contentDetails,statistics',
        },
      });

      return response.data.items || [];
    } catch (error) {
      this.logger.error('Failed to get video details:', error);
      return [];
    }
  }
  /**
   * Save exercise to database
   */
  private async saveExercise(
    searchResult: YouTubeSearchResult,
    videoDetails: YouTubeVideoDetails,
    muscleGroup: MuscleGroup,
  ): Promise<void> {
    const videoUrl = `https://www.youtube.com/watch?v=${searchResult.id.videoId}`;

    // Check if already exists
    const existing = await this.exerciseRepository.findOne({ videoUrl });
    if (existing) {
      this.logger.debug(`Exercise already exists: ${searchResult.snippet.title}`);
      return;
    }
    // Extract exercise name from title
    const { en, vi } = this.extractExerciseName(searchResult.snippet.title);

    // Generate keywords from title
    const keywords = this.generateKeywords(searchResult.snippet.title);

    // Parse duration from ISO 8601 (e.g., "PT15M33S" -> 933 seconds)
    const duration = this.parseDuration(videoDetails.contentDetails.duration);

    await this.exerciseRepository.create({
      name: { en, vi },
      keywords,
      videoUrl,
      source: VideoSource.YOUTUBE,
      muscleGroups: [muscleGroup],
      metadata: {
        title: searchResult.snippet.title,
        description: searchResult.snippet.description,
        channelName: searchResult.snippet.channelTitle,
        duration,
        viewCount: parseInt(videoDetails.statistics.viewCount, 10),
        likeCount: parseInt(videoDetails.statistics.likeCount, 10),
        publishedAt: new Date(searchResult.snippet.publishedAt),
      },
      thumbnailUrl: searchResult.snippet.thumbnails.medium.url,
      lastCrawledAt: new Date(),
      isActive: true,
      usageCount: 0,
    });

    this.logger.log(`Saved exercise: ${en}`);
  }
  /**
   * Extract exercise name from video title
   */
  private extractExerciseName(title: string): { en: string; vi: string } {
    // Remove common YouTube title patterns
    const cleanTitle = title
      .replace(/\|.*$/g, '') // Remove "| Channel Name"
      .replace(/\(.*?\)/g, '') // Remove (parentheses)
      .replace(/How to:/gi, '') // Remove "How to:"
      .replace(/Tutorial/gi, '') // Remove "Tutorial"
      .replace(/Proper Form/gi, '') // Remove "Proper Form"
      .replace(/\d+/g, '') // Remove numbers
      .trim();

    // Take first part before common separators
    const parts = cleanTitle.split(/[-–—:]/);
    const en = parts[0].trim();

    // TODO: Add proper translation service
    const vi = en; // For now, same as English

    return { en, vi };
  }
  /**
   * Generate search keywords from title
   */
  private generateKeywords(title: string): string[] {
    const cleanTitle = title.toLowerCase();
    const keywords: string[] = [];

    // Add full title
    keywords.push(cleanTitle);

    // Add individual words (excluding common words)
    const stopWords = [
      'how',
      'to',
      'the',
      'a',
      'an',
      'and',
      'or',
      'for',
      'with',
      'tutorial',
      'exercise',
    ];
    const words = cleanTitle.split(/\s+/).filter((w) => !stopWords.includes(w) && w.length > 2);
    keywords.push(...words);

    // Add common variations
    if (cleanTitle.includes('bench press')) {
      keywords.push('bench press', 'bench', 'press', 'barbell bench');
    }
    if (cleanTitle.includes('squat')) {
      keywords.push('squat', 'squats', 'back squat');
    }
    if (cleanTitle.includes('deadlift')) {
      keywords.push('deadlift', 'deadlifts', 'dl');
    }
    return [...new Set(keywords)]; // Remove duplicates
  }
  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseDuration(isoDuration: string): number {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }
  /**
   * Get search queries for each muscle group
   */
  private getSearchQueries(muscleGroup: MuscleGroup): string[] {
    const queries: Record<MuscleGroup, string[]> = {
      [MuscleGroup.CHEST]: [
        'bench press proper form tutorial',
        'chest workout exercises',
        'incline dumbbell press form',
        'chest fly technique',
      ],
      [MuscleGroup.BACK]: [
        'deadlift proper form',
        'pull up tutorial',
        'barbell row technique',
        'lat pulldown form',
      ],
      [MuscleGroup.LEGS]: [
        'squat proper form',
        'leg press technique',
        'lunge form tutorial',
        'leg curl exercise',
      ],
      [MuscleGroup.SHOULDERS]: [
        'overhead press form',
        'lateral raise technique',
        'shoulder workout exercises',
      ],
      [MuscleGroup.ARMS]: [
        'bicep curl proper form',
        'tricep extension technique',
        'arm workout exercises',
      ],
      [MuscleGroup.CORE]: ['plank proper form', 'ab workout exercises', 'core training tutorial'],
      [MuscleGroup.CARDIO]: [
        'running form tutorial',
        'cardio exercises at home',
        'hiit workout tutorial',
      ],
      [MuscleGroup.FULL_BODY]: [
        'full body workout',
        'compound exercises tutorial',
        'functional training exercises',
      ],
    };

    return queries[muscleGroup] || [];
  }
  /**
   * Crawl all muscle groups
   */
  async crawlAll(videosPerGroup: number = 5): Promise<number> {
    const muscleGroups = Object.values(MuscleGroup);
    let totalCrawled = 0;

    for (const group of muscleGroups) {
      this.logger.log(`Crawling ${group} exercises...`);
      const count = await this.crawlExercisesByMuscleGroup(group, videosPerGroup);
      totalCrawled += count;

      // Add delay to respect API rate limits
      await this.delay(2000);
    }
    this.logger.log(`Total exercises crawled: ${totalCrawled}`);
    return totalCrawled;
  }
  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
