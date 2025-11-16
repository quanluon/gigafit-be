import { z } from 'zod';

// Schema for structured InBody analysis per language
const LanguageAnalysisSchema = z.object({
  body_composition_summary: z
    .string()
    .describe('Summary of body composition analysis including key metrics and numbers'),
  recommendations: z.array(z.string()).describe('Array of 3 key recommendations for improvement'),
  training_nutrition_advice: z
    .string()
    .describe('Practical training and nutrition advice with specific guidance'),
});

// Schema for bilingual InBody analysis output
export const InbodyAnalysisSchema = z.object({
  en: LanguageAnalysisSchema.describe('Analysis in English with structured fields'),
  vi: LanguageAnalysisSchema.describe('Analysis in Vietnamese with structured fields'),
});

export type InbodyAnalysis = z.infer<typeof InbodyAnalysisSchema>;
