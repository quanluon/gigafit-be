export interface SegmentMeasurementDto {
  label?: string;
  value?: number;
  percentage?: number;
}

export interface InbodyMetricsSummary {
  weight?: number;
  skeletalMuscleMass?: number;
  bodyFatMass?: number;
  bodyFatPercent?: number;
  bmi?: number;
  height?: number; // Estimated height from body photo analysis
  visceralFatLevel?: number;
  basalMetabolicRate?: number;
  totalBodyWater?: number;
  protein?: number;
  minerals?: number;
  segmentalLean?: SegmentMeasurementDto[];
  segmentalFat?: SegmentMeasurementDto[];
}

/**
 * Structured InBody analysis per language
 */
export interface InbodyAnalysisPerLanguage {
  body_composition_summary: string;
  recommendations: string[];
  training_nutrition_advice: string;
}

/**
 * Bilingual InBody analysis with structured fields
 */
export interface InbodyAnalysis {
  en: InbodyAnalysisPerLanguage;
  vi: InbodyAnalysisPerLanguage;
}
