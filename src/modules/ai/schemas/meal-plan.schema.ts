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
export const MealComponentSchema = z.object({
  name: TranslatableSchema.describe('Ingredient name in English and Vietnamese'),
  quantity: z.string().describe('Quantity in grams (e.g., "120g", "30g")'),
  notes: TranslatableSchema.describe('Bilingual preparation note'),
});

export const MealItemSchema = z.object({
  name: TranslatableSchema.describe('Item name in English and Vietnamese'),
  description: TranslatableSchema.describe('Item description'),
  quantity: z.string().describe('Serving size for the item (e.g., "1 bowl", "200g")'),
  macros: MacrosSchema.describe('Macros for this item'),
  components: z
    .array(MealComponentSchema)
    .min(1)
    .describe('Ingredient-level breakdown with gram quantities'),
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
export type MealComponent = z.infer<typeof MealComponentSchema>;
export type MealItem = z.infer<typeof MealItemSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type DailyMealPlan = z.infer<typeof DailyMealPlanSchema>;
export type MealPlanSchedule = z.infer<typeof MealPlanScheduleSchema>;
