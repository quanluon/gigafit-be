import { z } from 'zod';

/**
 * Zod Schemas for Meal Plan Generation
 * Matches the database MealPlan schema structure
 */

/**
 * Translatable text schema
 */
export const TranslatableSchema = z.object({
  en: z.string().describe('English text'),
  vi: z.string().describe('Vietnamese text'),
});

/**
 * Macros schema
 */
export const MacrosSchema = z.object({
  calories: z.number().min(0).describe('Calories'),
  protein: z.number().min(0).describe('Protein in grams'),
  carbs: z.number().min(0).describe('Carbohydrates in grams'),
  fat: z.number().min(0).describe('Fat in grams'),
});

/**
 * Meal item schema (ingredients/food items in a meal)
 */
export const MealItemSchema = z.object({
  name: TranslatableSchema.describe('Item name in English and Vietnamese'),
  description: TranslatableSchema.optional().describe('Item description'),
  quantity: z.string().describe('Quantity (e.g., "200g", "1 cup", "2 pieces")'),
  macros: MacrosSchema.describe('Macros for this item'),
});

/**
 * Meal schema (breakfast, lunch, dinner, snack)
 */
export const MealSchema = z.object({
  type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).describe('Type of meal'),
  items: z.array(MealItemSchema).min(1).describe('Food items in this meal'),
  totalMacros: MacrosSchema.describe('Total macros for this meal'),
});

/**
 * Daily meal plan schema
 */
export const DailyMealPlanSchema = z.object({
  dayOfWeek: z
    .enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .describe('Day of the week'),
  meals: z
    .array(MealSchema)
    .min(3)
    .max(6)
    .describe('Meals for this day (typically 3-6 meals including snacks)'),
  dailyTotals: MacrosSchema.describe('Total macros for the entire day'),
});

/**
 * Complete meal plan schema
 */
export const MealPlanScheduleSchema = z.object({
  schedule: z.array(DailyMealPlanSchema).min(1).describe('Weekly meal schedule'),
});

/**
 * Type exports
 */
export type Translatable = z.infer<typeof TranslatableSchema>;
export type Macros = z.infer<typeof MacrosSchema>;
export type MealItem = z.infer<typeof MealItemSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type DailyMealPlan = z.infer<typeof DailyMealPlanSchema>;
export type MealPlanSchedule = z.infer<typeof MealPlanScheduleSchema>;
