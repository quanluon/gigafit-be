import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProviderName, DayOfWeek, ExperienceLevel, Goal } from '../../../common';
import {
  AI_TEMPERATURE,
  DEFAULT_AI_MODELS,
  DEFAULT_WORKOUT_TEMPLATES,
} from '../../../common/constants';
import { InbodyMetricsSummary, Translatable } from '../../../common/interfaces';
import { retryWithRateLimit } from '../../../common/utils/retry.util';
import { InbodyVisionSchema } from '../schemas/inbody-vision.schema';
import { InbodyAnalysisSchema } from '../schemas/inbody-analysis.schema';
import { MealPlanScheduleSchema } from '../schemas/meal-plan.schema';
import { WorkoutPlanSchema, WorkoutPlan as WorkoutPlanType } from '../schemas/workout-plan.schema';
import {
  GeneratePlanRequest,
  GeneratedPlan,
  IAIStrategy,
  WorkoutDay,
} from './ai-strategy.interface';

/**
 * OpenAI Implementation of AI Strategy using LangChain
 * Uses GPT models with structured output parsing via Zod
 */
@Injectable()
export class OpenAIStrategy implements IAIStrategy {
  private readonly logger = new Logger(OpenAIStrategy.name);
  private llm: ChatOpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.openai.apiKey');
    const modelName = DEFAULT_AI_MODELS.OPENAI;
    this.llm = new ChatOpenAI({
      modelName,
      temperature: AI_TEMPERATURE.BALANCED,
      openAIApiKey: apiKey,
    });
    this.logger.log(`✅ OpenAI Strategy initialized with model: ${modelName}`);
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return AIProviderName.OPENAI;
  }

  /**
   * Generate workout plan using OpenAI with structured output
   */
  async generateWorkoutPlan(request: GeneratePlanRequest): Promise<GeneratedPlan> {
    try {
      const userRequirements = this.buildUserRequirements(request);
      const exerciseVolumeGuidance = this.getExerciseVolumeGuidance(request.experienceLevel);

      const result = await retryWithRateLimit(
        async () => {
          // Use withStructuredOutput for automatic JSON parsing
          const llmWithStructuredOutput = this.llm.withStructuredOutput(WorkoutPlanSchema);

          const promptTemplate = ChatPromptTemplate.fromTemplate(`
Generate workout plan:

{userRequirements}

- ${exerciseVolumeGuidance}
- Proper muscle group distribution
- videoUrl: empty string ""
- Bilingual names/descriptions (en/vi)
`);

          const chain = promptTemplate.pipe(llmWithStructuredOutput);

          // LangChain automatically parses JSON and validates with Zod
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

  async generateInbodyAnalysis(
    metrics: InbodyMetricsSummary,
    rawText?: string,
  ): Promise<Translatable> {
    const metricsJson = JSON.stringify(metrics ?? {}, null, 2);
    const rawExcerpt = rawText ? rawText.slice(0, 1000) : 'N/A';

    try {
      const llmWithStructuredOutput = this.llm.withStructuredOutput(InbodyAnalysisSchema);

      const promptTemplate = ChatPromptTemplate.fromTemplate(`
Analyze InBody metrics. Return JSON with "en" and "vi" fields.

Metrics: {metricsJson}
Raw: {rawExcerpt}

For each language (max 100 words):
1. Body composition summary
2. 3 key recommendations
3. Training & nutrition advice

Use supportive tone. Speak as system advising user directly.`);

      const chain = promptTemplate.pipe(llmWithStructuredOutput);
      const result = await chain.invoke({
        metricsJson,
        rawExcerpt,
      });

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
   * Generate meal plan using OpenAI with structured output
   */
  async generateMealPlan(prompt: string): Promise<unknown> {
    try {
      const result = await retryWithRateLimit(
        async () => {
          // Use withStructuredOutput with MealPlanScheduleSchema
          const llmWithStructuredOutput = this.llm.withStructuredOutput(MealPlanScheduleSchema);

          const promptTemplate = ChatPromptTemplate.fromTemplate(`
Generate meal plan:

{userPrompt}

Bilingual (en/vi), accurate macros.
`);

          const chain = promptTemplate.pipe(llmWithStructuredOutput);

          // LangChain automatically parses JSON and validates
          const response = await chain.invoke({
            userPrompt: prompt,
          });

          // Response is already parsed JSON object
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
      this.logger.error('OpenAI meal plan generation failed:', error);
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

  private getExerciseVolumeGuidance(experienceLevel: ExperienceLevel): string {
    switch (experienceLevel) {
      case ExperienceLevel.BEGINNER:
        return 'Include 5-6 exercises per day with balanced push/pull movements for beginners.';
      case ExperienceLevel.INTERMEDIATE:
        return 'Include 6-8 exercises per day, adding accessory work to challenge intermediate athletes.';
      case ExperienceLevel.ADVANCED:
        return 'Include 7-9 exercises per day with advanced variations and supersets for experienced athletes.';
      default:
        return 'Include 6-8 exercises per day tailored to the user’s experience level.';
    }
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
   * Analyze InBody image from URL using OpenAI Vision
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

      const message = new HumanMessage({
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      });

      const result = await retryWithRateLimit(async () => {
        return await llmWithStructuredOutput.invoke([message]);
      });

      // Convert to InbodyMetricsSummary, filtering out zero/missing values
      const metrics: InbodyMetricsSummary = {};
      if (result?.weight) {
        metrics.weight = result.weight;
      }
      if (result?.skeletalMuscleMass) {
        metrics.skeletalMuscleMass = result.skeletalMuscleMass;
      }
      if (result?.bodyFatMass) {
        metrics.bodyFatMass = result.bodyFatMass;
      }
      if (result?.bodyFatPercent) {
        metrics.bodyFatPercent = result.bodyFatPercent;
      }
      if (result?.bmi) {
        metrics.bmi = result.bmi;
      }
      if (result?.visceralFatLevel) {
        metrics.visceralFatLevel = result.visceralFatLevel;
      }
      if (result?.basalMetabolicRate) {
        metrics.basalMetabolicRate = result.basalMetabolicRate;
      }
      if (result?.totalBodyWater) {
        metrics.totalBodyWater = result.totalBodyWater;
      }
      if (result?.protein) {
        metrics.protein = result.protein;
      }
      if (result?.minerals) {
        metrics.minerals = result.minerals;
      }

      return {
        metrics,
        ocrText: result.ocrText || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to analyze InBody image with OpenAI Vision', error);
      throw error;
    }
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
}
