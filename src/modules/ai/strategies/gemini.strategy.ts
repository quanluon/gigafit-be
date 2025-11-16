import { Injectable, Logger } from '@nestjs/common';
import { MealPlanScheduleSchema } from '../schemas/meal-plan.schema';
import { InbodyVisionSchema } from '../schemas/inbody-vision.schema';
import { InbodyAnalysisSchema } from '../schemas/inbody-analysis.schema';
import { ConfigService } from '@nestjs/config';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { retryWithRateLimit } from '../../../common/utils/retry.util';
import { AIProviderName, DayOfWeek, Goal } from '../../../common';
import { InbodyMetricsSummary, Translatable } from '../../../common/interfaces';
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
  ): Promise<Translatable> {
    const metricsJson = JSON.stringify(metrics ?? {}, null, 2);
    const rawExcerpt = rawText ? rawText.slice(0, 1200) : 'N/A';

    try {
      const llmWithStructuredOutput = this.llm.withStructuredOutput(InbodyAnalysisSchema);

      const prompt = `
Analyze InBody metrics. Return JSON with "en" and "vi" fields.

Metrics: ${metricsJson}
Raw: ${rawExcerpt}

For each (max 100 words):
1. Body composition summary
2. 3 key recommendations
3. Training & nutrition advice

Supportive tone. Advise user directly.`;

      const result = await llmWithStructuredOutput.invoke([{ role: 'user', content: prompt }]);

      return {
        en: result.en || 'Analysis unavailable.',
        vi: result.vi || 'Không thể phân tích.',
      };
    } catch (error) {
      this.logger.error('Failed to generate structured InBody analysis', error);
      return {
        en: 'Analysis unavailable.',
        vi: 'Không thể phân tích.',
      };
    }
  }

  /**
   * Analyze InBody image from URL using Gemini Vision
   */
  async analyzeInbodyImage(imageUrl: string): Promise<{
    metrics: InbodyMetricsSummary;
    ocrText?: string;
  }> {
    try {
      const llmWithStructuredOutput = this.llm.withStructuredOutput(InbodyVisionSchema);

      const prompt = `Extract InBody metrics from image. Values may be Vietnamese/English.

Find: Weight, Skeletal Muscle Mass, Body Fat Mass/%, BMI, Visceral Fat, BMR/TDEE, Total Body Water, Protein, Minerals.

Return JSON per schema. Include OCR text if readable.`;

      // Gemini supports image URLs directly in the content
      const response = await llmWithStructuredOutput.invoke([
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ]);

      // Convert to InbodyMetricsSummary, filtering out zero/missing values
      const metrics: InbodyMetricsSummary = {};
      if (response?.weight) {
        metrics.weight = response.weight;
      }
      if (response?.skeletalMuscleMass) {
        metrics.skeletalMuscleMass = response.skeletalMuscleMass;
      }
      if (response?.bodyFatMass) {
        metrics.bodyFatMass = response.bodyFatMass;
      }
      if (response?.bodyFatPercent) {
        metrics.bodyFatPercent = response.bodyFatPercent;
      }
      if (response?.bmi) {
        metrics.bmi = response.bmi;
      }
      if (response?.visceralFatLevel) {
        metrics.visceralFatLevel = response.visceralFatLevel;
      }
      if (response?.basalMetabolicRate) {
        metrics.basalMetabolicRate = response.basalMetabolicRate;
      }
      if (response?.totalBodyWater) {
        metrics.totalBodyWater = response.totalBodyWater;
      }
      if (response?.protein) {
        metrics.protein = response.protein;
      }
      if (response?.minerals) {
        metrics.minerals = response.minerals;
      }

      return {
        metrics,
        ocrText: response.ocrText || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to analyze InBody image with Gemini Vision', error);
      throw error;
    }
  }
}
