import { z } from 'zod';

/**
 * Zod Schemas for Workout Plan Generation
 * Provides runtime type validation and structured output parsing
 */

/**
 * Translatable text schema
 */
export const TranslatableSchema = z.object({
  en: z.string().describe('English text'),
  vi: z.string().describe('Vietnamese text'),
});

/**
 * Exercise schema
 */
export const ExerciseSchema = z.object({
  name: TranslatableSchema.describe('Exercise name in English and Vietnamese'),
  description: TranslatableSchema.describe('Exercise description in English and Vietnamese'),
  sets: z.number().int().min(1).max(10).describe('Number of sets (1-10)'),
  reps: z.string().describe('Repetitions (e.g., "8-10", "30 seconds")'),
  videoUrl: z.string().describe('YouTube video URL or empty string (we will fill this)'),
});

/**
 * Workout day schema
 */
export const WorkoutDaySchema = z.object({
  dayOfWeek: z
    .enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .describe('Day of the week'),
  focus: TranslatableSchema.describe('Focus area for the day (e.g., "Chest & Triceps")'),
  exercises: z
    .array(ExerciseSchema)
    .min(4)
    .max(8)
    .describe('List of exercises for this day (4-8 exercises)'),
});

/**
 * Complete workout plan schema
 */
export const WorkoutPlanSchema = z.object({
  schedule: z.array(WorkoutDaySchema).min(1).describe('Weekly workout schedule'),
});

/**
 * Meal schema
 */
export const MealSchema = z.object({
  name: TranslatableSchema.describe('Meal name'),
  description: TranslatableSchema.describe('Meal description'),
  calories: z.number().min(0).describe('Calories'),
  protein: z.number().min(0).describe('Protein in grams'),
  carbs: z.number().min(0).describe('Carbohydrates in grams'),
  fat: z.number().min(0).describe('Fat in grams'),
  ingredients: z.array(TranslatableSchema).describe('List of ingredients'),
});

/**
 * Meal day schema
 */
export const MealDaySchema = z.object({
  dayOfWeek: z
    .enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .describe('Day of the week'),
  meals: z.object({
    breakfast: MealSchema.optional(),
    lunch: MealSchema.optional(),
    dinner: MealSchema.optional(),
    snacks: z.array(MealSchema).optional(),
  }),
  totalCalories: z.number().min(0).describe('Total calories for the day'),
  totalProtein: z.number().min(0).describe('Total protein for the day'),
  totalCarbs: z.number().min(0).describe('Total carbs for the day'),
  totalFat: z.number().min(0).describe('Total fat for the day'),
});

/**
 * Complete meal plan schema
 */
export const MealPlanSchema = z.object({
  schedule: z.array(MealDaySchema).min(1).describe('Weekly meal schedule'),
});

/**
 * Type exports
 */
export type Translatable = z.infer<typeof TranslatableSchema>;
export type Exercise = z.infer<typeof ExerciseSchema>;
export type WorkoutDay = z.infer<typeof WorkoutDaySchema>;
export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type MealDay = z.infer<typeof MealDaySchema>;
export type MealPlan = z.infer<typeof MealPlanSchema>;
