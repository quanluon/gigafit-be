import { z } from 'zod';

const localizedStringSchema = z.object({
  en: z.string().min(1).describe('English copy written in a warm, professional PT voice'),
  vi: z.string().min(1).describe('Vietnamese copy written in a warm, professional PT voice'),
});

export const TrainingRecommendationSchema = z.object({
  title: localizedStringSchema.describe(
    'Short, encouraging title (max ~60 chars) in both languages',
  ),
  summary: localizedStringSchema.describe(
    'Comprehensive summary (2-4 paragraphs) per language with motivational, PT-styled guidance',
  ),
  metrics: z
    .object({})
    .catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .describe('Key metrics and data points to display (weight changes, calories, sessions, etc.)'),
  cta: localizedStringSchema
    .nullable()
    .describe('Optional CTA copy per language (e.g., "View Details"). Can be null if not needed.'),
});

export type TrainingRecommendation = z.infer<typeof TrainingRecommendationSchema>;
