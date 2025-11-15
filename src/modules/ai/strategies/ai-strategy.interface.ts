import { DayOfWeek, ExperienceLevel, Goal } from '../../../common';
import { Translatable } from '../../../common/interfaces';

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
   * Get the provider name
   * @returns Name of the AI provider (e.g., 'OpenAI', 'Gemini')
   */
  getProviderName(): string;
}
