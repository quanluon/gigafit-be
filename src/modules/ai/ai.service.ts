import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExerciseVideoDatabase } from './exercise-video-database';
import { ExerciseRepository } from '../../repositories';
import { AIProvider, DayOfWeek } from '../../common/enums';
import { OpenAIStrategy } from './strategies/openai.strategy';
import { GeminiStrategy } from './strategies/gemini.strategy';
import {
  IAIStrategy,
  GeneratePlanRequest,
  GeneratedPlan,
} from './strategies/ai-strategy.interface';

/**
 * AI Service with Strategy Pattern
 * Allows switching between different AI providers (OpenAI, Gemini)
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private strategy!: IAIStrategy;
  private readonly strategies: Map<AIProvider, IAIStrategy>;

  constructor(
    private readonly configService: ConfigService,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly openAIStrategy: OpenAIStrategy,
    private readonly geminiStrategy: GeminiStrategy,
  ) {
    // Initialize strategy map
    this.strategies = new Map<AIProvider, IAIStrategy>([
      [AIProvider.OPENAI, this.openAIStrategy],
      [AIProvider.GEMINI, this.geminiStrategy],
    ]);

    // Set initial strategy from config
    const provider = this.configService.get<string>('ai.provider') || AIProvider.OPENAI;
    this.setStrategy(provider as AIProvider);
  }

  /**
   * Set AI strategy (OpenAI or Gemini)
   * @param provider - AI provider enum
   */
  setStrategy(provider: AIProvider): void {
    const strategy = this.strategies.get(provider);

    if (!strategy) {
      this.logger.error(`Unknown AI provider: ${provider}. Falling back to OpenAI.`);
      this.strategy = this.openAIStrategy;
      return;
    }

    this.strategy = strategy;
    this.logger.log(`✅ AI Strategy set to: ${this.strategy.getProviderName()}`);
  }

  /**
   * Get current AI strategy
   * @returns Current AI strategy
   */
  getStrategy(): IAIStrategy {
    return this.strategy;
  }

  /**
   * Get current AI provider name
   * @returns Provider name (e.g., 'OpenAI', 'Gemini')
   */
  getCurrentProvider(): string {
    return this.strategy.getProviderName();
  }

  /**
   * Generate workout plan using current strategy
   */
  async generateWorkoutPlan(request: GeneratePlanRequest): Promise<GeneratedPlan> {
    this.logger.log(
      `Generating workout plan using ${this.getCurrentProvider()} for user with goal: ${request.goal}`,
    );

    // Delegate to current strategy
    const plan = await this.strategy.generateWorkoutPlan(request);

    // Enhance plan with video URLs (common post-processing)
    return this.validateAndEnhancePlan(plan, request.scheduleDays);
  }

  /**
   * Generate meal plan using current strategy
   */
  async generateMealPlan(prompt: string): Promise<unknown> {
    this.logger.log(`Generating meal plan using ${this.getCurrentProvider()}`);

    // Delegate to current strategy
    return this.strategy.generateMealPlan(prompt);
  }

  /**
   * Validate and enhance plan with video URLs
   * Common post-processing for all strategies
   */
  private async validateAndEnhancePlan(
    plan: GeneratedPlan,
    scheduleDays: (string | DayOfWeek)[],
  ): Promise<GeneratedPlan> {
    // Ensure plan includes all requested days
    const planDays = plan.schedule.map((day) => day.dayOfWeek);
    const missingDays = scheduleDays.filter(
      (day) => !planDays.includes(day as DayOfWeek),
    ) as DayOfWeek[];

    // Add default workouts for missing days (if any)
    if (missingDays.length > 0) {
      this.logger.warn(`Missing days detected: ${missingDays.join(', ')}. Adding defaults.`);
    }

    // Collect all unique exercise names (avoid N+1 queries)
    const allExerciseNames = new Set<string>();
    for (const day of plan.schedule) {
      for (const exercise of day.exercises) {
        allExerciseNames.add(exercise.name.en);
      }
    }

    // Bulk fetch all exercises from database in ONE query
    const exerciseMap = await this.exerciseRepository.findBulkByNames(Array.from(allExerciseNames));

    // Assign video URLs using the fetched map (O(1) lookups)
    for (const day of plan.schedule) {
      for (const exercise of day.exercises) {
        let videoUrl: string;

        // Try MongoDB database first (from bulk query result)
        const dbExercise = exerciseMap.get(exercise.name.en);
        if (dbExercise) {
          videoUrl = dbExercise.videoUrl;
          this.logger.debug(`[DB] Matched "${exercise.name.en}" to video: ${videoUrl}`);
        } else {
          // Fallback to static database
          videoUrl =
            ExerciseVideoDatabase.findVideo(exercise.name.en) ||
            ExerciseVideoDatabase.findVideo(exercise.name.vi);
          this.logger.debug(`[Static] Matched "${exercise.name.en}" to video: ${videoUrl}`);
        }

        exercise.videoUrl = videoUrl;
      }
    }

    return plan;
  }
}
