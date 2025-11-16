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
  visceralFatLevel?: number;
  basalMetabolicRate?: number;
  totalBodyWater?: number;
  protein?: number;
  minerals?: number;
  segmentalLean?: SegmentMeasurementDto[];
  segmentalFat?: SegmentMeasurementDto[];
}
