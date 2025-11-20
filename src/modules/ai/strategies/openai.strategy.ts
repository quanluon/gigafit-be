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
import { InbodyMetricsSummary, InbodyAnalysis } from '../../../common/interfaces';
import { retryWithRateLimit } from '../../../common/utils/retry.util';
import { InbodyVisionSchema } from '../schemas/inbody-vision.schema';
import { InbodyAnalysisSchema } from '../schemas/inbody-analysis.schema';
import { MealPlanScheduleSchema } from '../schemas/meal-plan.schema';
import { WorkoutPlanSchema, WorkoutPlan as WorkoutPlanType } from '../schemas/workout-plan.schema';
import { BodyPhotoVisionSchema } from '../schemas/body-photo-vision.schema';
import { TrainingRecommendationSchema } from '../schemas/training-recommendation.schema';
import {
  GeneratePlanRequest,
  GeneratedPlan,
  IAIStrategy,
  WorkoutDay,
  TrainingRecommendationContent,
  TrainingRecommendationInput,
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
  ): Promise<InbodyAnalysis> {
    const metricsJson = JSON.stringify(metrics ?? {}, null, 2);
    const rawExcerpt = rawText ? rawText.slice(0, 1000) : 'N/A';

    try {
      const llmWithStructuredOutput = this.llm.withStructuredOutput(InbodyAnalysisSchema);

      const promptTemplate = ChatPromptTemplate.fromTemplate(`
Analyze InBody metrics and provide structured analysis in both English and Vietnamese.

Metrics: {metricsJson}
Raw OCR text: {rawExcerpt}

IMPORTANT INSTRUCTIONS:
- If metrics are zero or missing, ESTIMATE reasonable values based on typical body composition for reference
- Always provide NUMBERS and ESTIMATIONS (even if approximate) so user can see and reference them
- Use supportive, personal trainer tone - speak as system directly advising the user

For each language, return JSON object with:
1. "body_composition_summary": Summary including key metrics and ESTIMATED NUMBERS (even if approximate)
2. "recommendations": Array of exactly 3 practical recommendations
3. "training_nutrition_advice": Specific, actionable advice with numbers and examples

Format: Each field should be concise but include specific numbers and estimates.`);

      const chain = promptTemplate.pipe(llmWithStructuredOutput);
      const result = await chain.invoke({
        metricsJson,
        rawExcerpt,
      });

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
   * Generate meal plan using OpenAI with structured output
   */
  async generateMealPlan(prompt: string): Promise<unknown> {
    try {
      const result = await retryWithRateLimit(
        async () => {
          // Use withStructuredOutput with MealPlanScheduleSchema
          const llmWithStructuredOutput = this.llm.withStructuredOutput(MealPlanScheduleSchema);

          const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are a dedicated personal nutrition coach. Generate a COMPLETE 7-day meal schedule (Monday → Sunday) even if the user only mentions specific days.

GUIDELINES:
- Each day must include exactly 4 meals: Breakfast, Lunch, Dinner, Snack.
- Use Vietnamese-inspired dishes, bilingual names/descriptions (en + vi).
- Every meal must include 2-3 items. Each item quantity MUST be in grams (e.g., “150g phở noodles”, “120g chicken breast”).
- For EACH meal item you must provide a \`components\` array (min 1 element). Every component describes an ingredient with bilingual name (en/vi), quantity in grams, and bilingual note (or empty strings) for preparation tips. The sum of component grams should match the item quantity.
- When naming dishes (e.g., Phở gà), break down the ingredients explicitly (noodle grams, protein grams, herbs, broth note). Add short preparation/serving notes such as “lean broth, limit added oil, light seasoning”.
- Provide detailed macros per item and accurate total macros per meal. Sum of items should match meal totals within ±5%.
- Daily calories should stay within ±50 kcal of the target provided in {userPrompt}. Maintain macro balance aligned with that target.
- Highlight dietary cautions when relevant (e.g., “no fatty broth”, “minimal fish sauce”, “grilled instead of fried”).
- Keep the tone supportive, like a private trainer preparing meals for the user.

INPUT CONTEXT:
{userPrompt}
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
    const { trainingEnvironment } = request;

    let requirements = `Goal: ${goal}, Level: ${experienceLevel}, Days: ${scheduleDays.join(',')}`;

    if (weight) requirements += `, ${weight}kg`;
    if (targetWeight) requirements += `→${targetWeight}kg`;
    if (height) requirements += `, ${height}cm`;
    if (workoutTimeMinutes) {
      requirements += `, ${workoutTimeMinutes}min/session`;
    }
    if (trainingEnvironment) {
      requirements += `\nEquipment: ${trainingEnvironment}`;
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
          ? Math.round(
              (Date.now() - new Date(previousResult.takenAt).getTime()) / (1000 * 60 * 60 * 24),
            )
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
      const message = new HumanMessage({
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      });

      const result = await retryWithRateLimit(async () => {
        return await llmWithStructuredOutput.invoke([message]);
      });

      // Convert to InbodyMetricsSummary
      const metrics: InbodyMetricsSummary = { ...result };

      // Update missing fields with previous values if reasonable
      if (previousResult?.metrics) {
        const prev = previousResult.metrics;
        // Only use previous values if current extraction is missing or zero
        if (!metrics.weight && prev.weight) metrics.weight = prev.weight;
        if (!metrics.bmi && prev.bmi) metrics.bmi = prev.bmi;
        if (!metrics.bodyFatPercent && prev.bodyFatPercent)
          metrics.bodyFatPercent = prev.bodyFatPercent;
        if (!metrics.skeletalMuscleMass && prev.skeletalMuscleMass)
          metrics.skeletalMuscleMass = prev.skeletalMuscleMass;
        if (!metrics.bodyFatMass && prev.bodyFatMass) metrics.bodyFatMass = prev.bodyFatMass;
        if (!metrics.visceralFatLevel && prev.visceralFatLevel)
          metrics.visceralFatLevel = prev.visceralFatLevel;
        if (!metrics.basalMetabolicRate && prev.basalMetabolicRate)
          metrics.basalMetabolicRate = prev.basalMetabolicRate;
        if (!metrics.totalBodyWater && prev.totalBodyWater)
          metrics.totalBodyWater = prev.totalBodyWater;
        if (!metrics.protein && prev.protein) metrics.protein = prev.protein;
        if (!metrics.minerals && prev.minerals) metrics.minerals = prev.minerals;
      }
      this.logger.log(
        `InBody image analysis completed${previousResult ? ' (with comparison)' : ''}. Extracted ${Object.keys(metrics).length} metrics.`,
      );

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
   * Analyze body photo from URL using OpenAI Vision to estimate body composition
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
      const metrics: InbodyMetricsSummary = { ...result };

      this.logger.log(`Body photo analysis completed. Confidence: ${result?.confidence || 0}%`);

      return metrics;
    } catch (error) {
      this.logger.error('Failed to analyze body photo with OpenAI Vision', error);
      throw error;
    }
  }
  async generateTrainingRecommendation(
    data: TrainingRecommendationInput,
    language: string,
  ): Promise<TrainingRecommendationContent> {
    const metricsPayload = this.buildMetricsPayload(data);
    try {
      const llmWithStructuredOutput = this.llm.withStructuredOutput(TrainingRecommendationSchema);

      const weightSeriesText = data.weightSeries7Days?.length
        ? data.weightSeries7Days.map((w) => `${w}kg`).join(', ')
        : 'N/A';

      const dataContext = `
Results snapshot:
- 7-day weight change: ${
        data.weightChange7Days !== undefined
          ? `${data.weightChange7Days > 0 ? '+' : ''}${data.weightChange7Days.toFixed(1)}kg`
          : 'N/A'
      }
- Total weight logs: ${data.totalWeightLogs}
- Latest 7 weights: ${weightSeriesText}
- Sessions (7 days): ${data.recentSessions}
- Calories burned (7 days): ${data.totalCalories}
${
  data.latestInbody
    ? `- Latest InBody: ${data.latestInbody.weight}kg • Body fat ${data.latestInbody.bodyFatPercent}% • Muscle ${data.latestInbody.skeletalMuscleMass}kg`
    : ''
}
${data.isFirstPlan ? '- First workout plan milestone' : ''}
`;

      const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are a veteran personal trainer (10+ years). Use the data to explain:
1. What just happened (results & effectiveness)
2. What it means (progress, gaps, readiness)
3. What to do next (clear next steps)

{dataContext}

Writing rules:
- Voice: warm coach, default to {language}
- Cite exact numbers; keep paragraphs lean with blank-line spacing
- Deliver each paragraph as 1-2 bullet-style sentences (use "- " prefix) to make the summary easy to scan
- Highlight wins or plateaus, address low activity, and tie each insight to an action

Deliver JSON:
1. Title (<=60 chars) in EN + VI
2. Summary: 2-3 short bullet paragraphs per language following result → meaning → next steps
3. Metrics: language-neutral stats from the data
4. CTA (optional) in EN + VI`);

      const chain = promptTemplate.pipe(llmWithStructuredOutput);
      const result = await chain.invoke({
        dataContext,
        language,
      });

      return {
        title: result.title,
        summary: result.summary,
        metrics: metricsPayload,
        cta: result.cta,
      };
    } catch (error) {
      this.logger.error('Failed to generate training recommendation', error);
      // Fallback to simple recommendation
      return {
        title: {
          en: 'Training Analysis',
          vi: 'Phân tích kết quả tập luyện',
        },
        summary: {
          en: 'We have analyzed your training data. Keep pushing and you will see results!',
          vi: 'Chúng tôi đã phân tích dữ liệu tập luyện của bạn. Tiếp tục nỗ lực và bạn sẽ thấy kết quả!',
        },
        metrics: metricsPayload,
        cta: {
          en: 'View Details',
          vi: 'Xem chi tiết',
        },
      };
    }
  }

  private buildMetricsPayload(data: TrainingRecommendationInput): Record<string, unknown> {
    const formatWeight = (value?: number): string =>
      value !== undefined ? `${value > 0 ? '+' : ''}${value.toFixed(1)}kg` : 'N/A';

    const formatSeries = (series?: number[]): string =>
      series?.length ? series.map((value) => `${value}kg`).join(', ') : 'N/A';

    return {
      weight_change: formatWeight(data.weightChange7Days),
      total_weight_logs: data.totalWeightLogs,
      weight_series_last_7_entries: formatSeries(data.weightSeries7Days),
      recent_training_sessions: data.recentSessions,
      total_calories_burned: data.totalCalories,
      latest_inbody:
        data.latestInbody && (data.latestInbody.weight || data.latestInbody.bodyFatPercent)
          ? `Weight ${data.latestInbody.weight ?? 'N/A'}kg, Body fat ${
              data.latestInbody.bodyFatPercent ?? 'N/A'
            }%, Muscle ${data.latestInbody.skeletalMuscleMass ?? 'N/A'}kg`
          : undefined,
      first_workout_plan: data.isFirstPlan ?? false,
    };
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
