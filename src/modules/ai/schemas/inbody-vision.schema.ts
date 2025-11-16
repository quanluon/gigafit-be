import { z } from 'zod';

// OpenAI's structured output requires ALL properties to be in the required[] array
// We make fields required but allow 0 for missing values, then filter them out in post-processing
export const InbodyVisionSchema = z.object({
  weight: z.number().describe('Weight in kg, or 0 if not found'),
  skeletalMuscleMass: z.number().describe('Skeletal muscle mass in kg, or 0 if not found'),
  bodyFatMass: z.number().describe('Body fat mass in kg, or 0 if not found'),
  bodyFatPercent: z.number().describe('Body fat percentage, or 0 if not found'),
  bmi: z.number().describe('Body Mass Index, or 0 if not found'),
  visceralFatLevel: z.number().describe('Visceral fat level, or 0 if not found'),
  basalMetabolicRate: z.number().describe('Basal Metabolic Rate / TDEE in kcal, or 0 if not found'),
  totalBodyWater: z.number().describe('Total body water in kg, or 0 if not found'),
  protein: z.number().describe('Protein in kg, or 0 if not found'),
  minerals: z.number().describe('Minerals in kg, or 0 if not found'),
  ocrText: z.string().describe('Raw text extracted from the image, or empty string if none'),
});

export type InbodyVisionResult = z.infer<typeof InbodyVisionSchema>;
