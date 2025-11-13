import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { retryWithRateLimit } from '../../../common/utils/retry.util';
import { DayOfWeek, Goal } from '../../../common';
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
    return 'OpenAI';
  }

  /**
   * Generate workout plan using OpenAI with LangChain and Zod validation
   */
  async generateWorkoutPlan(request: GeneratePlanRequest): Promise<GeneratedPlan> {
    try {
      // Create structured output parser with Zod schema
      const parser = StructuredOutputParser.fromZodSchema(WorkoutPlanSchema);

      // Create prompt template
      const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are a professional fitness trainer. Generate a workout plan based on the following user requirements:

{userRequirements}

Generate a workout plan with the following specifications:
- Include 4-6 exercises per day
- Ensure proper muscle group distribution and recovery
- Use common exercise names (e.g., "Bench Press", "Squat", "Deadlift")
- videoUrl should be empty string "" (we will fill this automatically)
- Focus on exercise quality over quantity

Common exercises to choose from:
- Chest: Bench Press, Incline Press, Dumbbell Fly, Push-ups
- Back: Deadlift, Pull-ups, Barbell Row, Lat Pulldown
- Legs: Squat, Leg Press, Lunges, Leg Curl
- Shoulders: Overhead Press, Lateral Raise, Front Raise
- Arms: Bicep Curl, Tricep Extension, Hammer Curl, Dips

{formatInstructions}
`);

      // Format user requirements
      const userRequirements = this.buildUserRequirements(request);

      // Generate with retry logic
      const result = await retryWithRateLimit(
        async () => {
          const chain = promptTemplate.pipe(this.llm).pipe(parser);

          const response = await chain.invoke({
            userRequirements,
            formatInstructions: parser.getFormatInstructions(),
          });

          return response as WorkoutPlanType;
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
   * Generate meal plan using OpenAI with LangChain
   */
  async generateMealPlan(prompt: string): Promise<unknown> {
    try {
      const result = await retryWithRateLimit(
        async () => {
          const promptTemplate = ChatPromptTemplate.fromTemplate(`
You are a professional nutritionist and meal planner. Generate a detailed, nutritionally accurate meal plan.

{userPrompt}

Return your response as valid JSON with a "schedule" property containing the meal plan.
Include bilingual names (English and Vietnamese) and precise macro calculations.
`);

          const chain = promptTemplate.pipe(this.llm);

          const response = await chain.invoke({
            userPrompt: prompt,
          });

          // Parse JSON response
          const content = response.content as string;
          const parsed = JSON.parse(content);
          return parsed.schedule;
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
    const { goal, experienceLevel, scheduleDays, weight, height, targetWeight } = request;

    let requirements = `
- Goal: ${goal}
- Experience Level: ${experienceLevel}
- Training Days: ${scheduleDays.join(', ')}`;

    if (weight) requirements += `\n- Current Weight: ${weight}kg`;
    if (targetWeight) requirements += `\n- Target Weight: ${targetWeight}kg`;
    if (height) requirements += `\n- Height: ${height}cm`;

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
}
