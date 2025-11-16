import { z } from 'zod';

// Schema for bilingual InBody analysis output
export const InbodyAnalysisSchema = z.object({
  en: z.string().describe('Analysis in English'),
  vi: z.string().describe('Analysis in Vietnamese'),
});

export type InbodyAnalysis = z.infer<typeof InbodyAnalysisSchema>;
