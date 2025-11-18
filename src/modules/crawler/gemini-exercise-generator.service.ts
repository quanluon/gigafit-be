import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import { ExerciseRepository } from '../../repositories';
import { VideoSource, MuscleGroup, Exercise } from '../../repositories/schemas/exercise.schema';

interface GeneratedExercise {
  name: {
    en: string;
    vi: string;
  };
  keywords: string[];
  videoUrl: string;
  muscleGroups: MuscleGroup[];
  metadata: {
    title: string;
    description: string;
    channelName: string;
  };
}
@Injectable()
export class GeminiExerciseGeneratorService {
  private readonly gemini: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiExerciseGeneratorService.name);
  private readonly model: GenerativeModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly exerciseRepository: ExerciseRepository,
  ) {
    const apiKey = this.configService.get<string>('crawler.google.apiKey') || '';
    this.gemini = new GoogleGenerativeAI(apiKey);
    this.model = this.gemini.getGenerativeModel({ model: 'gemini-flash-latest' });
  }
  /**
   * Generate exercises for all muscle groups in bulk using Gemini
   */
  async generateAllExercises(exercisesPerGroup: number = 10): Promise<number> {
    this.logger.log('Generating exercises for all muscle groups using Gemini RAG...');

    const muscleGroups = Object.values(MuscleGroup);
    const allExercises: Partial<Exercise>[] = [];

    for (const group of muscleGroups) {
      this.logger.log(`Generating ${exercisesPerGroup} exercises for ${group}...`);
      const exercises = await this.generateExercisesForMuscleGroup(group, exercisesPerGroup);
      allExercises.push(...exercises);
    }
    // Bulk insert all exercises
    if (allExercises.length > 0) {
      const count = await this.exerciseRepository.bulkInsert(allExercises);
      this.logger.log(`Bulk inserted ${count} exercises into database`);
      return count;
    }
    return 0;
  }
  /**
   * Generate exercises for specific muscle group
   */
  async generateExercisesForMuscleGroup(
    muscleGroup: MuscleGroup,
    count: number = 10,
  ): Promise<Partial<Exercise>[]> {
    const prompt = this.buildPrompt(muscleGroup, count);

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const data = JSON.parse(jsonMatch[0]) as { exercises: GeneratedExercise[] };

      // Convert to database format
      const exercises = data.exercises.map((ex) => ({
        name: ex.name,
        keywords: ex.keywords,
        videoUrl: ex.videoUrl,
        source: VideoSource.MANUAL, // Mark as AI-generated
        muscleGroups: ex.muscleGroups,
        metadata: ex.metadata,
        thumbnailUrl: this.extractThumbnailUrl(ex.videoUrl),
        isActive: true,
        usageCount: 0,
        lastCrawledAt: new Date(),
      }));

      this.logger.log(`Generated ${exercises.length} exercises for ${muscleGroup}`);
      return exercises;
    } catch (error) {
      this.logger.error(`Failed to generate exercises for ${muscleGroup}:`, error);
      return [];
    }
  }
  /**
   * Build prompt for Gemini to generate exercises with real YouTube URLs
   */
  private buildPrompt(muscleGroup: MuscleGroup, count: number): string {
    const muscleGroupDescriptions: Record<MuscleGroup, string> = {
      [MuscleGroup.CHEST]: 'chest muscles (pectorals, bench press, push-ups)',
      [MuscleGroup.BACK]: 'back muscles (lats, traps, deadlift, rows)',
      [MuscleGroup.LEGS]: 'leg muscles (quads, hamstrings, glutes, squat)',
      [MuscleGroup.SHOULDERS]: 'shoulder muscles (deltoids, overhead press)',
      [MuscleGroup.ARMS]: 'arm muscles (biceps, triceps, forearms)',
      [MuscleGroup.CORE]: 'core muscles (abs, obliques, lower back)',
      [MuscleGroup.CARDIO]: 'cardiovascular exercises (running, cycling, HIIT)',
      [MuscleGroup.FULL_BODY]: 'full body compound exercises',
    };

    return `Generate ${count} popular exercise videos for ${muscleGroupDescriptions[muscleGroup]}.

For each exercise, provide:
1. Exercise name (English and Vietnamese translation)
2. Keywords for matching (include variations, common names)
3. A REAL, VERIFIED YouTube video URL from trusted fitness channels (AthleanX, ScottHermanFitness, Jeff Nippard, etc.)
4. Video title and channel name
5. Brief description

IMPORTANT:
- Only include REAL YouTube videos that exist (use your knowledge of popular fitness YouTube channels)
- URLs must be in format: https://www.youtube.com/watch?v=VIDEO_ID
- Choose high-quality instructional videos with good form demonstrations
- Include variety (beginner to advanced)
- Prefer videos from these channels: AthleanX, ScottHermanFitness, Jeff Nippard, Jeremy Ethier, Calisthenicmovement

Output as JSON:
{
  "exercises": [
    {
      "name": {
        "en": "Bench Press",
        "vi": "Đẩy ngực"
      },
      "keywords": ["bench press", "barbell bench", "flat bench", "đẩy ngực", "chest press"],
      "videoUrl": "https://www.youtube.com/watch?v=rT7DgCr-3pg",
      "muscleGroups": ["chest"],
      "metadata": {
        "title": "How To: Barbell Bench Press | 3 GOLDEN RULES",
        "description": "Learn proper bench press form with AthleanX",
        "channelName": "AthleanX"
      }
    }
  ]
}

Generate ${count} exercises now.`;
  }
  /**
   * Extract YouTube thumbnail URL from video URL
   */
  private extractThumbnailUrl(videoUrl: string): string {
    const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (match && match[1]) {
      return `https://i.ytimg.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return '';
  }
  /**
   * Verify if YouTube URL exists (optional validation)
   */
  async verifyYouTubeUrl(videoUrl: string): Promise<boolean> {
    try {
      const videoId = this.extractVideoId(videoUrl);
      if (!videoId) return false;

      // Simple HEAD request to check if video exists
      const checkUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
      const response = await fetch(checkUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  /**
   * Extract video ID from URL
   */
  private extractVideoId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }
  /**
   * Generate exercises and verify URLs
   */
  async generateAndVerifyExercises(
    muscleGroup: MuscleGroup,
    count: number = 10,
  ): Promise<Partial<Exercise>[]> {
    const exercises = await this.generateExercisesForMuscleGroup(muscleGroup, count);

    // Filter out invalid URLs (optional)
    const validExercises: Partial<Exercise>[] = [];

    for (const exercise of exercises) {
      const isValid = await this.verifyYouTubeUrl(exercise.videoUrl as string);
      if (isValid) {
        validExercises.push(exercise);
      } else {
        this.logger.warn(`Invalid YouTube URL: ${exercise.videoUrl}`);
      }
    }
    this.logger.log(`Verified ${validExercises.length}/${exercises.length} exercises`);
    return validExercises;
  }
}
