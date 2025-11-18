import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExerciseVideoDatabase } from './exercise-video-database';
import { ExerciseRepository } from '../../repositories';
import { AIProvider, AIProviderName, DayOfWeek } from '../../common/enums';
import { OpenAIStrategy } from './strategies/openai.strategy';
import { GeminiStrategy } from './strategies/gemini.strategy';
import {
  IAIStrategy,
  GeneratePlanRequest,
  GeneratedPlan,
} from './strategies/ai-strategy.interface';
import { InbodyMetricsSummary, InbodyAnalysis } from '../../common/interfaces';

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
      [AIProvider.OPENAI, this.openAIStrategy as IAIStrategy],
      [AIProvider.GEMINI, this.geminiStrategy as IAIStrategy],
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
  async generateInbodyAnalysis(
    metrics: InbodyMetricsSummary,
    rawText?: string,
  ): Promise<InbodyAnalysis> {
    return this.strategy.generateInbodyAnalysis(metrics, rawText);
  }
  /**
   * Analyze InBody image from URL using AI vision
   */
  async analyzeInbodyImage(
    imageUrl: string,
    previousResult?: {
      metrics?: InbodyMetricsSummary;
      takenAt?: Date;
    } | null,
  ): Promise<{
    metrics: InbodyMetricsSummary;
    ocrText?: string;
  }> {
    return this.strategy.analyzeInbodyImage(imageUrl, previousResult);
  }
  /**
   * Analyze body photo from URL using AI vision to estimate body composition
   */
  async analyzeBodyPhoto(imageUrl: string): Promise<InbodyMetricsSummary> {
    return this.strategy.analyzeBodyPhoto(imageUrl);
  }
  /**
   * Generate workout plan using current strategy with automatic fallback
   */
  async generateWorkoutPlan(request: GeneratePlanRequest): Promise<GeneratedPlan> {
    this.logger.log(
      `Generating workout plan using ${this.getCurrentProvider()} for user with goal: ${request.goal}`,
    );

    try {
      // Try current strategy
      const plan = await this.strategy.generateWorkoutPlan(request);
      return await this.validateAndEnhancePlan(plan, request.scheduleDays);
    } catch (error) {
      // Check if it's a quota/billing error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuotaError =
        errorMessage.includes('InsufficientQuotaError') ||
        errorMessage.includes('exceeded your current quota') ||
        errorMessage.includes('billing');

      if (isQuotaError) {
        this.logger.warn(
          `${this.getCurrentProvider()} quota exceeded. Falling back to alternative provider...`,
        );
        const fallbackPlan = await this.tryFallbackWorkout(request);
        return await this.validateAndEnhancePlan(fallbackPlan, request.scheduleDays);
      }
      throw error;
    }
  }
  /**
   * Generate meal plan using current strategy with automatic fallback
   */
  async generateMealPlan(prompt: string): Promise<unknown> {
    this.logger.log(`Generating meal plan using ${this.getCurrentProvider()}`);

    try {
      // Try current strategy
      return await this.strategy.generateMealPlan(prompt);
    } catch (error) {
      // Check if it's a quota/billing error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isQuotaError =
        errorMessage.includes('InsufficientQuotaError') ||
        errorMessage.includes('exceeded your current quota') ||
        errorMessage.includes('billing');

      if (isQuotaError) {
        this.logger.warn(
          `${this.getCurrentProvider()} quota exceeded. Falling back to alternative provider...`,
        );
        return await this.tryFallbackMeal(prompt);
      }
      throw error;
    }
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
  /**
   * Try fallback strategy for workout plan generation
   */
  private async tryFallbackWorkout(request: GeneratePlanRequest): Promise<GeneratedPlan> {
    const currentProvider = this.getCurrentProvider();
    const fallbackProvider =
      currentProvider === AIProviderName.OPENAI ? AIProvider.GEMINI : AIProvider.OPENAI;

    this.logger.log(`🔄 Switching to ${fallbackProvider} as fallback...`);
    const originalStrategy = this.strategy;

    try {
      this.setStrategy(fallbackProvider);
      const plan = await this.strategy.generateWorkoutPlan(request);
      this.logger.log(`✅ Successfully generated workout plan using ${fallbackProvider} fallback`);
      this.strategy = originalStrategy;
      return plan;
    } catch (fallbackError) {
      this.strategy = originalStrategy;
      this.logger.error(`❌ Fallback to ${fallbackProvider} also failed:`, fallbackError);
      throw fallbackError;
    }
  }
  /**
   * Try fallback strategy for meal plan generation
   */
  private async tryFallbackMeal(prompt: string): Promise<unknown> {
    const currentProvider = this.getCurrentProvider();
    const fallbackProvider =
      currentProvider === AIProviderName.OPENAI ? AIProvider.GEMINI : AIProvider.OPENAI;

    this.logger.log(`🔄 Switching to ${fallbackProvider} as fallback...`);
    const originalStrategy = this.strategy;

    try {
      this.setStrategy(fallbackProvider);
      const result = await this.strategy.generateMealPlan(prompt);
      this.logger.log(`✅ Successfully generated meal plan using ${fallbackProvider} fallback`);
      this.strategy = originalStrategy;
      return result;
    } catch (fallbackError) {
      this.strategy = originalStrategy;
      this.logger.error(`❌ Fallback to ${fallbackProvider} also failed:`, fallbackError);
      throw fallbackError;
    }
  }
}
