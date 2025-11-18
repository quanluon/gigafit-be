import { DayOfWeek, ExperienceLevel, Goal } from '../../../common';
import { InbodyMetricsSummary, InbodyAnalysis, Translatable } from '../../../common/interfaces';

/**
 * Request interface for workout plan generation
 */
export interface GeneratePlanRequest {
  goal: Goal;
  experienceLevel: ExperienceLevel;
  scheduleDays: DayOfWeek[];
  weight?: number;
  height?: number;
  targetWeight?: number;
  workoutTimeMinutes?: number;
  notes?: string;
  inbodySummary?: string;
  inbodyMetrics?: InbodyMetricsSummary;
}
/**
 * Exercise interface
 */
export interface Exercise {
  name: Translatable;
  description: Translatable;
  sets: number;
  reps: string;
  videoUrl: string;
}
/**
 * Workout day interface
 */
export interface WorkoutDay {
  dayOfWeek: DayOfWeek;
  focus: Translatable;
  exercises: Exercise[];
}
/**
 * Generated plan interface
 */
export interface GeneratedPlan {
  schedule: WorkoutDay[];
}
/**
 * Abstract Strategy Interface for AI Providers
 * Defines the contract that all AI strategy implementations must follow
 */
export interface IAIStrategy {
  /**
   * Generate a workout plan based on user requirements
   * @param request - User's workout requirements
   * @returns Generated workout plan
   */
  generateWorkoutPlan(request: GeneratePlanRequest): Promise<GeneratedPlan>;

  /**
   * Generate a meal plan based on user prompt
   * @param prompt - Detailed meal plan prompt
   * @returns Generated meal plan schedule
   */
  generateMealPlan(prompt: string): Promise<unknown>;

  /**
   * Generate analysis for InBody metrics in both English and Vietnamese
   * Returns structured analysis with body_composition_summary, recommendations, and training_nutrition_advice
   */
  generateInbodyAnalysis(metrics: InbodyMetricsSummary, rawText?: string): Promise<InbodyAnalysis>;

  /**
   * Analyze InBody image from URL using vision AI
   * @param imageUrl - URL of the InBody image
   * @returns Extracted metrics and OCR text as JSON
   */
  analyzeInbodyImage(
    imageUrl: string,
    previousResult?: {
      metrics?: InbodyMetricsSummary;
      takenAt?: Date;
    } | null,
  ): Promise<{
    metrics: InbodyMetricsSummary;
    ocrText?: string;
  }>;

  /**
   * Analyze body photo from URL using vision AI to estimate body composition
   * @param imageUrl - URL of the body photo
   * @returns Estimated metrics from the photo
   */
  analyzeBodyPhoto(imageUrl: string): Promise<InbodyMetricsSummary>;

  /**
   * Get the provider name
   * @returns Name of the AI provider (e.g., 'OpenAI', 'Gemini')
   */
  getProviderName(): string;
}
