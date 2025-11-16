import { z } from 'zod';

// Schema for AI vision analysis of body photos
// Estimates body composition metrics from a full-body photo
export const BodyPhotoVisionSchema = z.object({
  weight: z.number().describe('Estimated weight in kg, or 0 if unable to estimate'),
  bodyFatPercent: z.number().describe('Estimated body fat percentage, or 0 if unable to estimate'),
  skeletalMuscleMass: z
    .number()
    .describe('Estimated skeletal muscle mass in kg, or 0 if unable to estimate'),
  bmi: z
    .number()
    .describe(
      'Estimated BMI calculated from estimated weight and height, or 0 if unable to estimate',
    ),
  estimatedHeight: z
    .number()
    .describe('Estimated height in cm from photo analysis, or 0 if unable to estimate'),
  bodyFatMass: z
    .number()
    .describe(
      'Estimated body fat mass in kg (calculated from weight and body fat %), or 0 if unable to estimate',
    ),
  visceralFatLevel: z
    .number()
    .describe('Estimated visceral fat level (1-59), or 0 if unable to estimate'),
  basalMetabolicRate: z
    .number()
    .describe('Estimated Basal Metabolic Rate (BMR) in kcal/day, or 0 if unable to estimate'),
  totalBodyWater: z
    .number()
    .describe('Estimated total body water in kg, or 0 if unable to estimate'),
  protein: z.number().describe('Estimated protein mass in kg, or 0 if unable to estimate'),
  minerals: z.number().describe('Estimated minerals mass in kg, or 0 if unable to estimate'),
  confidence: z.number().describe('Confidence score 0-100 for the overall estimation accuracy'),
});

export type BodyPhotoVisionResult = z.infer<typeof BodyPhotoVisionSchema>;
