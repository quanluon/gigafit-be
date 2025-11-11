import { Injectable, Logger } from '@nestjs/common';
import { ExerciseRepository } from '../../repositories';
import { VideoSource, MuscleGroup } from '../../repositories/schemas/exercise.schema';

/**
 * Service to seed initial exercise data from the static video database
 */
@Injectable()
export class SeedExercisesService {
  private readonly logger = new Logger(SeedExercisesService.name);

  constructor(private readonly exerciseRepository: ExerciseRepository) {}

  async seedInitialExercises(): Promise<number> {
    this.logger.log('Seeding initial exercise database...');

    const exercises = [
      // CHEST
      {
        name: { en: 'Bench Press', vi: 'Đẩy ngực' },
        keywords: ['bench press', 'barbell bench', 'flat bench', 'đẩy ngực', 'bench'],
        videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
        source: VideoSource.MANUAL,
        muscleGroups: [MuscleGroup.CHEST],
        metadata: {
          title: 'How To: Barbell Bench Press',
          channelName: 'AthleanX',
        },
        isActive: true,
        usageCount: 0,
      },
      {
        name: { en: 'Incline Dumbbell Press', vi: 'Đẩy tạ đơn dốc' },
        keywords: ['incline bench', 'incline press', 'incline dumbbell', 'đẩy tạ đơn dốc'],
        videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
        source: VideoSource.MANUAL,
        muscleGroups: [MuscleGroup.CHEST],
        metadata: {
          title: 'How To: Incline Dumbbell Press',
          channelName: 'ScottHermanFitness',
        },
        isActive: true,
        usageCount: 0,
      },
      // BACK
      {
        name: { en: 'Deadlift', vi: 'Nâng tạ đòn' },
        keywords: ['deadlift', 'barbell deadlift', 'nâng tạ đòn', 'dl'],
        videoUrl: 'https://www.youtube.com/watch?v=ytGaGIn3SjE',
        source: VideoSource.MANUAL,
        muscleGroups: [MuscleGroup.BACK, MuscleGroup.LEGS],
        metadata: {
          title: 'How To: Deadlift',
          channelName: 'Buff Dudes',
        },
        isActive: true,
        usageCount: 0,
      },
      {
        name: { en: 'Pull-ups', vi: 'Kéo xà' },
        keywords: ['pull up', 'pullup', 'chin up', 'kéo xà'],
        videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
        source: VideoSource.MANUAL,
        muscleGroups: [MuscleGroup.BACK, MuscleGroup.ARMS],
        metadata: {
          title: 'How To: Pull-up',
          channelName: 'AthleanX',
        },
        isActive: true,
        usageCount: 0,
      },
      // LEGS
      {
        name: { en: 'Squat', vi: 'Squat' },
        keywords: ['squat', 'back squat', 'barbell squat', 'squats'],
        videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
        source: VideoSource.MANUAL,
        muscleGroups: [MuscleGroup.LEGS],
        metadata: {
          title: 'How To: Squat',
          channelName: 'AthleanX',
        },
        isActive: true,
        usageCount: 0,
      },
      // SHOULDERS
      {
        name: { en: 'Overhead Press', vi: 'Đẩy vai' },
        keywords: ['overhead press', 'military press', 'shoulder press', 'đẩy vai'],
        videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
        source: VideoSource.MANUAL,
        muscleGroups: [MuscleGroup.SHOULDERS],
        metadata: {
          title: 'How To: Overhead Press',
          channelName: 'AthleanX',
        },
        isActive: true,
        usageCount: 0,
      },
      // ARMS
      {
        name: { en: 'Bicep Curl', vi: 'Cuốn tay trước' },
        keywords: ['bicep curl', 'dumbbell curl', 'cuốn tay trước', 'curl'],
        videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
        source: VideoSource.MANUAL,
        muscleGroups: [MuscleGroup.ARMS],
        metadata: {
          title: 'How To: Bicep Curl',
          channelName: 'AthleanX',
        },
        isActive: true,
        usageCount: 0,
      },
    ];

    try {
      const count = await this.exerciseRepository.bulkInsert(exercises);
      this.logger.log(`Seeded ${count} initial exercises successfully`);
      return count;
    } catch (error) {
      this.logger.error('Failed to seed exercises:', error);
      return 0;
    }
  }

  /**
   * Check if database needs seeding
   */
  async needsSeeding(): Promise<boolean> {
    const count = await this.exerciseRepository.count({});
    return count === 0;
  }

  /**
   * Seed if database is empty
   */
  async seedIfNeeded(): Promise<void> {
    const needs = await this.needsSeeding();

    if (needs) {
      this.logger.log('Exercise database is empty, seeding initial data...');
      await this.seedInitialExercises();
    } else {
      this.logger.log('Exercise database already contains data, skipping seed');
    }
  }
}
