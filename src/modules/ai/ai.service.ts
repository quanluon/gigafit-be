import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Translatable } from '../../common/interfaces';
import { DayOfWeek, ExperienceLevel, Goal } from '../../common';

interface GeneratePlanRequest {
  goal: Goal;
  experienceLevel: ExperienceLevel;
  scheduleDays: DayOfWeek[];
  weight?: number;
  height?: number;
  targetWeight?: number;
}

interface Exercise {
  name: Translatable;
  description: Translatable;
  sets: number;
  reps: string;
  videoUrl: string;
}

interface WorkoutDay {
  dayOfWeek: DayOfWeek;
  focus: Translatable;
  exercises: Exercise[];
}

interface GeneratedPlan {
  schedule: WorkoutDay[];
}

@Injectable()
export class AIService {
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.openai.apiKey');
    this.openai = new OpenAI({ apiKey });
  }

  async generateWorkoutPlan(request: GeneratePlanRequest): Promise<GeneratedPlan> {
    const prompt = this.buildPrompt(request);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional fitness trainer. Generate workout plans in JSON format with multi-language support (EN and VN). Always include YouTube video URLs for exercises.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0].message.content || '{}';
      const plan = JSON.parse(content) as GeneratedPlan;

      return this.validateAndEnhancePlan(plan, request.scheduleDays);
    } catch (error) {
      // Fallback to template-based generation if AI fails
      Logger.error(`Failed to generate workout plan: ${JSON.stringify(error)}`);
      return this.generateFallbackPlan(request);
    }
  }

  private buildPrompt(request: GeneratePlanRequest): string {
    const { goal, experienceLevel, scheduleDays, weight, height, targetWeight } = request;

    return `Generate a workout plan with the following specifications:
    - Goal: ${goal}
    - Experience Level: ${experienceLevel}
    - Training Days: ${scheduleDays.join(', ')}
    ${weight ? `- Current Weight: ${weight}kg` : ''}
    ${targetWeight ? `- Target Weight: ${targetWeight}kg` : ''}
    ${height ? `- Height: ${height}cm` : ''}

    Create a JSON object with this structure:
    {
      "schedule": [
        {
          "dayOfWeek": "monday",
          "focus": { "en": "Chest & Triceps", "vi": "Ngực & Tay sau" },
          "exercises": [
            {
              "name": { "en": "Bench Press", "vi": "Đẩy ngực" },
              "description": { "en": "A compound chest exercise", "vi": "Bài tập compound phát triển cơ ngực" },
              "sets": 4,
              "reps": "8-10",
              "videoUrl": "https://www.youtube.com/watch?v=rT7DgCr-3pg"
            }
          ]
        }
      ]
    }

    Include 4-6 exercises per day. Ensure proper muscle group distribution and recovery.`;
  }

  private validateAndEnhancePlan(plan: GeneratedPlan, scheduleDays: DayOfWeek[]): GeneratedPlan {
    // Ensure plan includes all requested days
    const planDays = plan.schedule.map((day) => day.dayOfWeek);
    const missingDays = scheduleDays.filter((day) => !planDays.includes(day));

    // Add default workouts for missing days
    for (const day of missingDays) {
      plan.schedule.push(this.createDefaultWorkout(day));
    }

    // Ensure YouTube URLs are valid
    for (const day of plan.schedule) {
      for (const exercise of day.exercises) {
        if (!exercise.videoUrl.includes('youtube.com')) {
          exercise.videoUrl = 'https://www.youtube.com/watch?v=example';
        }
      }
    }

    return plan;
  }

  private generateFallbackPlan(request: GeneratePlanRequest): GeneratedPlan {
    const schedule: WorkoutDay[] = [];

    for (const day of request.scheduleDays) {
      schedule.push(this.createDefaultWorkout(day, request.goal));
    }

    return { schedule };
  }

  private createDefaultWorkout(day: DayOfWeek, _: Goal = Goal.MUSCLE_GAIN): WorkoutDay {
    const workoutTemplates: Record<DayOfWeek, { focus: Translatable; exercises: Exercise[] }> = {
      [DayOfWeek.MONDAY]: {
        focus: { en: 'Chest & Triceps', vi: 'Ngực & Tay sau' },
        exercises: [
          {
            name: { en: 'Bench Press', vi: 'Đẩy ngực' },
            description: {
              en: 'A compound chest exercise',
              vi: 'Bài tập compound phát triển cơ ngực',
            },
            sets: 4,
            reps: '8-10',
            videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
          },
          {
            name: { en: 'Incline Dumbbell Press', vi: 'Đẩy tạ đơn dốc' },
            description: {
              en: 'Targets upper chest',
              vi: 'Tập trung vào ngực trên',
            },
            sets: 4,
            reps: '10-12',
            videoUrl: 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
          },
        ],
      },
      [DayOfWeek.TUESDAY]: {
        focus: { en: 'Back & Biceps', vi: 'Lưng & Tay trước' },
        exercises: [
          {
            name: { en: 'Deadlift', vi: 'Nâng tạ đòn' },
            description: {
              en: 'Compound back exercise',
              vi: 'Bài tập compound cho lưng',
            },
            sets: 4,
            reps: '6-8',
            videoUrl: 'https://www.youtube.com/watch?v=ytGaGIn3SjE',
          },
        ],
      },
      [DayOfWeek.WEDNESDAY]: {
        focus: { en: 'Legs', vi: 'Chân' },
        exercises: [
          {
            name: { en: 'Squat', vi: 'Squat' },
            description: {
              en: 'Compound leg exercise',
              vi: 'Bài tập compound cho chân',
            },
            sets: 4,
            reps: '8-10',
            videoUrl: 'https://www.youtube.com/watch?v=ultWZbUMPL8',
          },
        ],
      },
      [DayOfWeek.THURSDAY]: {
        focus: { en: 'Shoulders', vi: 'Vai' },
        exercises: [
          {
            name: { en: 'Overhead Press', vi: 'Đẩy vai' },
            description: {
              en: 'Shoulder press exercise',
              vi: 'Bài tập đẩy vai',
            },
            sets: 4,
            reps: '8-10',
            videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
          },
        ],
      },
      [DayOfWeek.FRIDAY]: {
        focus: { en: 'Arms', vi: 'Tay' },
        exercises: [
          {
            name: { en: 'Bicep Curls', vi: 'Cuốn tay trước' },
            description: {
              en: 'Isolation bicep exercise',
              vi: 'Bài tập cô lập tay trước',
            },
            sets: 3,
            reps: '12-15',
            videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
          },
        ],
      },
      [DayOfWeek.SATURDAY]: {
        focus: { en: 'Full Body', vi: 'Toàn thân' },
        exercises: [
          {
            name: { en: 'Pull-ups', vi: 'Kéo xà' },
            description: {
              en: 'Compound upper body exercise',
              vi: 'Bài tập compound thân trên',
            },
            sets: 4,
            reps: '8-12',
            videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
          },
        ],
      },
      [DayOfWeek.SUNDAY]: {
        focus: { en: 'Active Recovery', vi: 'Hồi phục tích cực' },
        exercises: [
          {
            name: { en: 'Light Cardio', vi: 'Cardio nhẹ' },
            description: {
              en: 'Low intensity recovery',
              vi: 'Hồi phục cường độ thấp',
            },
            sets: 1,
            reps: '20-30min',
            videoUrl: 'https://www.youtube.com/watch?v=gC_L9qAHVJ8',
          },
        ],
      },
    };

    return {
      dayOfWeek: day,
      focus: workoutTemplates[day].focus,
      exercises: workoutTemplates[day].exercises,
    };
  }

  async generateMealPlan(prompt: string): Promise<unknown> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a professional nutritionist and meal planner. Generate detailed, nutritionally accurate meal plans in JSON format. Always include bilingual names (English and Vietnamese) and precise macro calculations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(content) as { schedule: unknown };
      return parsed.schedule;
    } catch (error) {
      Logger.error('AI meal plan generation failed:', error);
      throw error;
    }
  }
}
