import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../common/base';
import { Exercise, MuscleGroup, VideoSource } from './schemas/exercise.schema';

@Injectable()
export class ExerciseRepository extends BaseRepository<Exercise> {
  constructor(@InjectModel(Exercise.name) exerciseModel: Model<Exercise>) {
    super(exerciseModel);
  }

  /**
   * Find exercise by keywords (fuzzy matching)
   */
  async findByKeywords(searchTerm: string): Promise<Exercise[]> {
    const term = searchTerm.toLowerCase().trim();

    return this.model
      .find({
        isActive: true,
        keywords: { $in: [new RegExp(term, 'i')] },
      })
      .sort({ usageCount: -1 }) // Most used first
      .limit(5)
      .exec();
  }

  /**
   * Find best matching exercise
   */
  async findBestMatch(exerciseName: string): Promise<Exercise | null> {
    const term = exerciseName.toLowerCase().trim();

    // Try exact match first
    const exactMatch = await this.model
      .findOne({
        isActive: true,
        keywords: term,
      })
      .exec();

    if (exactMatch) {
      // Increment usage count
      await this.model.updateOne({ _id: exactMatch._id }, { $inc: { usageCount: 1 } }).exec();
      return exactMatch;
    }

    // Try partial match
    const partialMatch = await this.model
      .findOne({
        isActive: true,
        keywords: { $regex: term, $options: 'i' },
      })
      .sort({ usageCount: -1 })
      .exec();

    if (partialMatch) {
      // Increment usage count
      await this.model.updateOne({ _id: partialMatch._id }, { $inc: { usageCount: 1 } }).exec();
      return partialMatch;
    }

    return null;
  }

  /**
   * Get exercises by muscle group
   */
  async findByMuscleGroup(muscleGroup: MuscleGroup): Promise<Exercise[]> {
    return this.model
      .find({
        isActive: true,
        muscleGroups: muscleGroup,
      })
      .sort({ usageCount: -1 })
      .exec();
  }

  /**
   * Get exercises by source
   */
  async findBySource(source: VideoSource): Promise<Exercise[]> {
    return this.model
      .find({
        isActive: true,
        source,
      })
      .sort({ usageCount: -1 })
      .exec();
  }

  /**
   * Get most popular exercises
   */
  async findMostPopular(limit: number = 20): Promise<Exercise[]> {
    return this.model.find({ isActive: true }).sort({ usageCount: -1 }).limit(limit).exec();
  }

  /**
   * Get recently crawled exercises
   */
  async findRecentlyCrawled(limit: number = 20): Promise<Exercise[]> {
    return this.model.find({ isActive: true }).sort({ lastCrawledAt: -1 }).limit(limit).exec();
  }

  /**
   * Update video metadata
   */
  async updateMetadata(id: string, metadata: Partial<Exercise>): Promise<Exercise | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...metadata,
            lastCrawledAt: new Date(),
          },
        },
        { new: true },
      )
      .exec();
  }

  /**
   * Bulk insert exercises (for initial seeding)
   */
  async bulkInsert(exercises: Partial<Exercise>[]): Promise<number> {
    const result = await this.model.insertMany(exercises, { ordered: false });
    return result.length;
  }

  /**
   * Find multiple exercises by names in bulk (optimized for N+1 prevention)
   */
  async findBulkByNames(exerciseNames: string[]): Promise<Map<string, Exercise>> {
    const lowerCaseNames = exerciseNames.map((name) => name.toLowerCase().trim());

    // Single query to find all matching exercises
    const exercises = await this.model
      .find({
        isActive: true,
        keywords: { $in: lowerCaseNames.map((name) => new RegExp(name, 'i')) },
      })
      .sort({ usageCount: -1 })
      .exec();

    // Create a map for O(1) lookups
    const exerciseMap = new Map<string, Exercise>();

    for (const name of exerciseNames) {
      const normalizedName = name.toLowerCase().trim();

      // Find best match for this name
      const match = exercises.find((ex) =>
        ex.keywords.some(
          (keyword) =>
            keyword === normalizedName ||
            keyword.includes(normalizedName) ||
            normalizedName.includes(keyword),
        ),
      );

      if (match) {
        exerciseMap.set(name, match);
        // Increment usage count for matched exercise
        await this.model.updateOne({ _id: match._id }, { $inc: { usageCount: 1 } }).exec();
      }
    }

    return exerciseMap;
  }
}
