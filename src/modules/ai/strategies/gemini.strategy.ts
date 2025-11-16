import { Injectable, Logger } from '@nestjs/common';
import { MealPlanScheduleSchema } from '../schemas/meal-plan.schema';
import { InbodyVisionSchema } from '../schemas/inbody-vision.schema';
import { InbodyAnalysisSchema } from '../schemas/inbody-analysis.schema';
import { BodyPhotoVisionSchema } from '../schemas/body-photo-vision.schema';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { retryWithRateLimit } from '../../../common/utils/retry.util';
import { AIProviderName, DayOfWeek, Goal } from '../../../common';
import { InbodyMetricsSummary, InbodyAnalysis } from '../../../common/interfaces';
import {
  DEFAULT_AI_MODELS,
  AI_TEMPERATURE,
  DEFAULT_WORKOUT_TEMPLATES,
} from '../../../common/constants';
import { WorkoutPlanSchema, WorkoutPlan as WorkoutPlanType } from '../schemas/workout-plan.schema';
import {
  IAIStrategy,
  GeneratePlanRequest,
  GeneratedPlan,
  WorkoutDay,
} from './ai-strategy.interface';

/**
 * Google Gemini Implementation of AI Strategy using LangChain
 * Uses Gemini models with structured output parsing via Zod
 */
@Injectable()
export class GeminiStrategy implements IAIStrategy {
  private readonly logger = new Logger(GeminiStrategy.name);
  private llm: ChatGoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.gemini.apiKey');
    this.llm = new ChatGoogleGenerativeAI({
      model: DEFAULT_AI_MODELS.GEMINI,
      temperature: AI_TEMPERATURE.BALANCED,
      apiKey: apiKey || '',
    });
    this.logger.log(`✅ Gemini Strategy initialized with model: ${DEFAULT_AI_MODELS.GEMINI}`);
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return AIProviderName.GEMINI;
  }

  /**
   * Generate workout plan using Gemini with structured output
   */
  async generateWorkoutPlan(request: GeneratePlanRequest): Promise<GeneratedPlan> {
    try {
      const userRequirements = this.buildUserRequirements(request);

      const result = await retryWithRateLimit(
        async () => {
          // Use withStructuredOutput for automatic JSON parsing
          const llmWithStructuredOutput = this.llm.withStructuredOutput(WorkoutPlanSchema);

          const promptTemplate = ChatPromptTemplate.fromTemplate(`
Generate workout plan:

{userRequirements}

- 4-6 exercises/day
- Proper muscle distribution
- videoUrl: empty string ""
- Bilingual names/descriptions (en/vi)
`);

          const chain = promptTemplate.pipe(llmWithStructuredOutput);

          // LangChain automatically parses JSON and validates with Zod - returns object, not string!
          const validated = await chain.invoke({
            userRequirements,
          });

          return validated as WorkoutPlanType;
        },
        {
          maxAttempts: 5,
          baseDelay: 20000,
          maxDelay: 120000,
          backoffMultiplier: 2,
        },
        this.logger,
      );

      // Convert Zod types to interface types
      return this.convertToGeneratedPlan(result);
    } catch (error) {
      this.logger.error(`Failed to generate workout plan: ${JSON.stringify(error)}`);
      return this.generateFallbackPlan(request);
    }
  }

  /**
   * Generate meal plan using Gemini with structured output
   */
  async generateMealPlan(prompt: string): Promise<unknown> {
    try {
      const result = await retryWithRateLimit(
        async () => {
          // Use withStructuredOutput with MealPlanScheduleSchema
          const llmWithStructuredOutput = this.llm.withStructuredOutput(MealPlanScheduleSchema);

          const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are a professional nutritionist and meal planner. Generate a detailed, nutritionally accurate meal plan.

{userPrompt}

Include bilingual names (English and Vietnamese) and precise macro calculations.
Return a JSON object with a "schedule" property containing the meal plan.
`);

          const chain = promptTemplate.pipe(llmWithStructuredOutput);

          // LangChain automatically parses JSON and validates - returns object, not string!
          const response = await chain.invoke({
            userPrompt: prompt,
          });

          // Response is already a parsed JSON object
          return (response as { schedule: unknown }).schedule;
        },
        {
          maxAttempts: 5,
          baseDelay: 20000,
          maxDelay: 120000,
          backoffMultiplier: 2,
        },
        this.logger,
      );

      return result;
    } catch (error) {
      this.logger.error('Gemini meal plan generation failed:', error);
      throw error;
    }
  }

  /**
   * Build user requirements string
   */
  private buildUserRequirements(request: GeneratePlanRequest): string {
    const {
      goal,
      experienceLevel,
      scheduleDays,
      weight,
      height,
      targetWeight,
      workoutTimeMinutes,
      notes,
      inbodySummary,
      inbodyMetrics,
    } = request;

    let requirements = `Goal: ${goal}, Level: ${experienceLevel}, Days: ${scheduleDays.join(',')}`;

    if (weight) requirements += `, ${weight}kg`;
    if (targetWeight) requirements += `→${targetWeight}kg`;
    if (height) requirements += `, ${height}cm`;
    if (workoutTimeMinutes) {
      requirements += `, ${workoutTimeMinutes}min/session`;
    }
    if (notes) {
      requirements += `\n${notes.slice(0, 100)}`;
    }
    if (inbodySummary) {
      requirements += `\nInBody: ${inbodySummary.slice(0, 150)}`;
    }
    if (inbodyMetrics?.bodyFatPercent) {
      requirements += `\nBF: ${inbodyMetrics.bodyFatPercent}%`;
    }
    if (inbodyMetrics?.skeletalMuscleMass) {
      requirements += `, Muscle: ${inbodyMetrics.skeletalMuscleMass}kg`;
    }

    return requirements;
  }

  /**
   * Convert Zod-validated type to GeneratedPlan interface
   */
  private convertToGeneratedPlan(zodPlan: WorkoutPlanType): GeneratedPlan {
    return {
      schedule: zodPlan.schedule.map((day) => ({
        dayOfWeek: day.dayOfWeek as DayOfWeek,
        focus: day.focus,
        exercises: day.exercises.map((ex) => ({
          name: ex.name,
          description: ex.description,
          sets: ex.sets,
          reps: ex.reps,
          videoUrl: ex.videoUrl,
        })),
      })),
    };
  }

  /**
   * Generate fallback plan if AI fails
   */
  private generateFallbackPlan(request: GeneratePlanRequest): GeneratedPlan {
    const schedule: WorkoutDay[] = [];

    for (const day of request.scheduleDays) {
      schedule.push(this.createDefaultWorkout(day, request.goal));
    }

    return { schedule };
  }

  /**
   * Create default workout for a day using shared templates
   */
  private createDefaultWorkout(day: DayOfWeek, _: Goal = Goal.MUSCLE_GAIN): WorkoutDay {
    const template = DEFAULT_WORKOUT_TEMPLATES[day];

    return {
      dayOfWeek: day,
      focus: template.focus,
      exercises: template.exercises,
    };
  }

  async generateInbodyAnalysis(
    metrics: InbodyMetricsSummary,
    rawText?: string,
  ): Promise<InbodyAnalysis> {
    const metricsJson = JSON.stringify(metrics ?? {}, null, 2);
    const rawExcerpt = rawText ? rawText.slice(0, 1200) : 'N/A';

    try {
      const llmWithStructuredOutput = this.llm.withStructuredOutput(InbodyAnalysisSchema);

      const prompt = `
Analyze InBody metrics and provide structured analysis in both English and Vietnamese.

Metrics: ${metricsJson}
Raw OCR text: ${rawExcerpt}

IMPORTANT INSTRUCTIONS:
- If metrics are zero or missing, ESTIMATE reasonable values based on typical body composition for reference
- Always provide NUMBERS and ESTIMATIONS (even if approximate) so user can see and reference them
- Use supportive, personal trainer tone - speak as system directly advising the user

For each language, return JSON object with:
1. "body_composition_summary": Summary including key metrics and ESTIMATED NUMBERS (even if approximate)
2. "recommendations": Array of exactly 3 practical recommendations
3. "training_nutrition_advice": Specific, actionable advice with numbers and examples

Format: Each field should be concise but include specific numbers and estimates.`;

      const result = await llmWithStructuredOutput.invoke([{ role: 'user', content: prompt }]);

      return result;
    } catch (error) {
      this.logger.error('Failed to generate structured InBody analysis', error);
      return {
        en: {
          body_composition_summary: 'Analysis unavailable.',
          recommendations: [],
          training_nutrition_advice: '',
        },
        vi: {
          body_composition_summary: 'Không thể phân tích.',
          recommendations: [],
          training_nutrition_advice: '',
        },
      };
    }
  }

  /**
   * Analyze InBody image from URL using Gemini Vision
   * Optionally compares with previous InBody result for accuracy
   */
  async analyzeInbodyImage(
    imageUrl: string,
    previousResult?: {
      metrics?: InbodyMetricsSummary;
      takenAt?: Date;
    } | null,
  ): Promise<{
    metrics: InbodyMetricsSummary;
    ocrText?: string;
  }> {
    try {
      const llmWithStructuredOutput = this.llm.withStructuredOutput(InbodyVisionSchema);

      let prompt = `Extract InBody metrics from image. Values may be Vietnamese/English.

Find: Weight, Skeletal Muscle Mass, Body Fat Mass/%, BMI, Visceral Fat, BMR/TDEE, Total Body Water, Protein, Minerals.

Return JSON per schema. Include OCR text if readable.`;

      // Add comparison context if previous result exists
      if (previousResult?.metrics) {
        const previousMetrics = previousResult.metrics;
        const previousDate = previousResult.takenAt
          ? new Date(previousResult.takenAt).toLocaleDateString()
          : 'previous scan';
        const daysDiff = previousResult.takenAt
          ? Math.round((Date.now() - new Date(previousResult.takenAt).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const comparisonText = `
IMPORTANT: Compare with previous InBody result from ${previousDate}${daysDiff ? ` (${daysDiff} days ago)` : ''}:
${previousMetrics.weight ? `- Weight: ${previousMetrics.weight} kg` : ''}
${previousMetrics.bodyFatPercent ? `- Body Fat %: ${previousMetrics.bodyFatPercent}%` : ''}
${previousMetrics.skeletalMuscleMass ? `- Skeletal Muscle Mass: ${previousMetrics.skeletalMuscleMass} kg` : ''}
${previousMetrics.bmi ? `- BMI: ${previousMetrics.bmi}` : ''}
${previousMetrics.visceralFatLevel ? `- Visceral Fat Level: ${previousMetrics.visceralFatLevel}` : ''}
${previousMetrics.basalMetabolicRate ? `- BMR: ${previousMetrics.basalMetabolicRate} kcal/day` : ''}

Use this previous data as a reference to:
1. Ensure extracted values are consistent and realistic
2. Identify any significant changes or discrepancies
3. Improve accuracy by cross-referencing with known values
4. Fill in missing fields if the previous scan had those values and they seem reasonable`;

        prompt += comparisonText;
      }

      // Gemini supports image URLs directly in the content
      const response = await llmWithStructuredOutput.invoke([
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ]);

      // Convert to InbodyMetricsSummary
      const metrics: InbodyMetricsSummary = { ...response };

      // Update missing fields with previous values if reasonable
      if (previousResult?.metrics) {
        const prev = previousResult.metrics;
        // Only use previous values if current extraction is missing or zero
        if (!metrics.weight && prev.weight) metrics.weight = prev.weight;
        if (!metrics.bmi && prev.bmi) metrics.bmi = prev.bmi;
        if (!metrics.bodyFatPercent && prev.bodyFatPercent) metrics.bodyFatPercent = prev.bodyFatPercent;
        if (!metrics.skeletalMuscleMass && prev.skeletalMuscleMass)
          metrics.skeletalMuscleMass = prev.skeletalMuscleMass;
        if (!metrics.bodyFatMass && prev.bodyFatMass) metrics.bodyFatMass = prev.bodyFatMass;
        if (!metrics.visceralFatLevel && prev.visceralFatLevel)
          metrics.visceralFatLevel = prev.visceralFatLevel;
        if (!metrics.basalMetabolicRate && prev.basalMetabolicRate)
          metrics.basalMetabolicRate = prev.basalMetabolicRate;
        if (!metrics.totalBodyWater && prev.totalBodyWater) metrics.totalBodyWater = prev.totalBodyWater;
        if (!metrics.protein && prev.protein) metrics.protein = prev.protein;
        if (!metrics.minerals && prev.minerals) metrics.minerals = prev.minerals;
      }

      this.logger.log(
        `InBody image analysis completed${previousResult ? ' (with comparison)' : ''}. Extracted ${Object.keys(metrics).length} metrics.`,
      );

      return {
        metrics,
        ocrText: response.ocrText || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to analyze InBody image with Gemini Vision', error);
      throw error;
    }
  }

  /**
   * Analyze body photo from URL using Gemini Vision to estimate body composition
   */
  async analyzeBodyPhoto(imageUrl: string): Promise<InbodyMetricsSummary> {
    try {
      const llmWithStructuredOutput = this.llm.withStructuredOutput(BodyPhotoVisionSchema);

      const prompt = `Analyze this full-body photo to estimate comprehensive body composition metrics similar to InBody scan results.

Estimate the following metrics:
- Weight (kg)
- Body fat percentage (%)
- Skeletal muscle mass (kg)
- Body fat mass (kg)
- BMI (Body Mass Index)
- Estimated height (cm)
- Visceral fat level (1-59 scale)
- Basal Metabolic Rate (BMR) in kcal/day
- Total body water (kg)
- Protein mass (kg)
- Minerals mass (kg)

Provide confidence score 0-100 for overall estimation accuracy.

Note: These are estimates based on visual analysis. Actual values may vary. Use typical body composition ratios and formulas when needed.`;

      // Gemini supports image URLs directly in the content
      const response = await llmWithStructuredOutput.invoke([
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ]);

      // Convert to InbodyMetricsSummary, filtering out zero/missing values
      const metrics: InbodyMetricsSummary = { ...response };

      this.logger.log(`Body photo analysis completed. Confidence: ${response?.confidence || 0}%`);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to analyze body photo with Gemini Vision', error);
      throw error;
    }
  }
}
