import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { MealPlanRepository, MealPlan } from '../../repositories';
import { UserRepository } from '../../repositories';
import { TDEECalculatorService } from './services/tdee-calculator.service';
import { DayOfWeek, MealType, Goal } from '../../common/enums';
import { AIService } from '../ai/ai.service';

@Injectable()
export class MealService {
  constructor(
    private readonly mealPlanRepository: MealPlanRepository,
    private readonly userRepository: UserRepository,
    private readonly tdeeCalculator: TDEECalculatorService,
    private readonly aiService: AIService,
  ) {}

  async generateMealPlan(
    userId: string,
    scheduleDays?: DayOfWeek[],
    useAI?: boolean,
    fullWeek?: boolean,
  ): Promise<MealPlan> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate required user data
    if (
      !user.weight ||
      !user.height ||
      !user.age ||
      !user.gender ||
      !user.activityLevel ||
      !user.goal
    ) {
      throw new BadRequestException(
        'Missing required user data: weight, height, age, gender, activityLevel, and goal are required',
      );
    }

    // Calculate TDEE and macros
    const tdeeData = this.tdeeCalculator.calculateComplete(
      user.weight,
      user.height,
      user.age,
      user.gender,
      user.activityLevel,
      user.goal,
    );

    // Get current week and year
    const now = new Date();
    const week = this.getWeekNumber(now);
    const year = now.getFullYear();

    // Determine days to generate meals for
    let daysToGenerate: DayOfWeek[];
    if (fullWeek) {
      // Generate for all 7 days
      daysToGenerate = Object.values(DayOfWeek);
    } else {
      // Use provided days, or user's schedule days, or all days
      daysToGenerate = scheduleDays || user.scheduleDays || Object.values(DayOfWeek);
    }

    // Generate meal schedule
    const schedule = useAI
      ? await this.generateMealScheduleWithAI(daysToGenerate, tdeeData, user.goal)
      : this.generateMealSchedule(daysToGenerate, tdeeData);

    // Check if plan already exists for this week
    const existingPlan = await this.mealPlanRepository.findByUserAndWeek(userId, week, year);
    if (existingPlan) {
      const updatedPlan = await this.mealPlanRepository.update(existingPlan._id!.toString(), {
        dailyTargets: {
          calories: tdeeData.targetCalories,
          protein: tdeeData.protein,
          carbs: tdeeData.carbs,
          fat: tdeeData.fat,
        },
        tdee: tdeeData.tdee,
        schedule,
      });
      if (!updatedPlan) {
        throw new NotFoundException('Failed to update meal plan');
      }
      return updatedPlan;
    }

    // Create new plan
    return this.mealPlanRepository.create({
      userId,
      week,
      year,
      dailyTargets: {
        calories: tdeeData.targetCalories,
        protein: tdeeData.protein,
        carbs: tdeeData.carbs,
        fat: tdeeData.fat,
      },
      tdee: tdeeData.tdee,
      schedule,
    });
  }

  async getCurrentPlan(userId: string): Promise<MealPlan> {
    const plan = await this.mealPlanRepository.findCurrentWeekPlan(userId);
    if (!plan) {
      throw new NotFoundException('No meal plan found for current week');
    }
    return plan;
  }

  async calculateUserTDEE(userId: string): Promise<{
    bmr: number;
    tdee: number;
    targetCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      !user.weight ||
      !user.height ||
      !user.age ||
      !user.gender ||
      !user.activityLevel ||
      !user.goal
    ) {
      throw new BadRequestException('Missing required user data for TDEE calculation');
    }

    return this.tdeeCalculator.calculateComplete(
      user.weight,
      user.height,
      user.age,
      user.gender,
      user.activityLevel,
      user.goal,
    );
  }

  private generateMealSchedule(
    days: DayOfWeek[],
    tdeeData: { targetCalories: number; protein: number; carbs: number; fat: number },
  ): MealPlan['schedule'] {
    return days.map((day) => ({
      dayOfWeek: day,
      meals: this.generateDailyMeals(tdeeData),
      dailyTotals: {
        calories: tdeeData.targetCalories,
        protein: tdeeData.protein,
        carbs: tdeeData.carbs,
        fat: tdeeData.fat,
      },
    }));
  }

  private generateDailyMeals(tdeeData: {
    targetCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  }): MealPlan['schedule'][0]['meals'] {
    // Distribute calories across meals: Breakfast 30%, Lunch 35%, Dinner 30%, Snack 5%
    const breakfastCals = Math.round(tdeeData.targetCalories * 0.3);
    const lunchCals = Math.round(tdeeData.targetCalories * 0.35);
    const dinnerCals = Math.round(tdeeData.targetCalories * 0.3);
    const snackCals = Math.round(tdeeData.targetCalories * 0.05);

    return [
      this.createMeal(MealType.BREAKFAST, breakfastCals, tdeeData),
      this.createMeal(MealType.LUNCH, lunchCals, tdeeData),
      this.createMeal(MealType.DINNER, dinnerCals, tdeeData),
      this.createMeal(MealType.SNACK, snackCals, tdeeData),
    ];
  }

  private createMeal(
    type: MealType,
    calories: number,
    tdeeData: { protein: number; carbs: number; fat: number },
  ): MealPlan['schedule'][0]['meals'][0] {
    const proteinRatio = type === MealType.SNACK ? 0.2 : 0.33;
    const mealProtein = Math.round(tdeeData.protein * proteinRatio);
    const mealCarbs = Math.round(tdeeData.carbs * proteinRatio);
    const mealFat = Math.round(tdeeData.fat * proteinRatio);

    // Template meal items based on meal type
    const items = this.getMealTemplateItems(type, mealProtein, mealCarbs, mealFat);

    return {
      type,
      items,
      totalMacros: {
        calories,
        protein: mealProtein,
        carbs: mealCarbs,
        fat: mealFat,
      },
    };
  }

  private getMealTemplateItems(
    type: MealType,
    protein: number,
    carbs: number,
    fat: number,
  ): MealPlan['schedule'][0]['meals'][0]['items'] {
    const templates: Record<
      MealType,
      Array<{
        name: { en: string; vi: string };
        description: { en: string; vi: string };
        quantity: string;
      }>
    > = {
      [MealType.BREAKFAST]: [
        {
          name: { en: 'Oatmeal with Protein', vi: 'Yến mạch với Protein' },
          description: {
            en: 'Whole grain oats with protein powder',
            vi: 'Yến mạch nguyên hạt với bột protein',
          },
          quantity: '1 cup',
        },
        {
          name: { en: 'Eggs', vi: 'Trứng' },
          description: { en: 'Scrambled or boiled eggs', vi: 'Trứng bác hoặc luộc' },
          quantity: `${Math.ceil(protein / 12)} eggs`,
        },
        {
          name: { en: 'Banana', vi: 'Chuối' },
          description: { en: 'Fresh fruit for energy', vi: 'Trái cây tươi cung cấp năng lượng' },
          quantity: '1 medium',
        },
      ],
      [MealType.LUNCH]: [
        {
          name: { en: 'Grilled Chicken Breast', vi: 'Ức gà nướng' },
          description: { en: 'Lean protein source', vi: 'Nguồn protein nạc' },
          quantity: `${Math.round(protein / 0.31)}g`,
        },
        {
          name: { en: 'Brown Rice', vi: 'Cơm gạo lứt' },
          description: { en: 'Complex carbohydrates', vi: 'Carbohydrate phức hợp' },
          quantity: `${Math.round(carbs / 0.77)}g`,
        },
        {
          name: { en: 'Mixed Vegetables', vi: 'Rau củ hỗn hợp' },
          description: { en: 'Fiber and micronutrients', vi: 'Chất xơ và vi chất' },
          quantity: '200g',
        },
      ],
      [MealType.DINNER]: [
        {
          name: { en: 'Salmon Fillet', vi: 'Phi lê cá hồi' },
          description: { en: 'Omega-3 rich protein', vi: 'Protein giàu Omega-3' },
          quantity: '150g',
        },
        {
          name: { en: 'Sweet Potato', vi: 'Khoai lang' },
          description: { en: 'Nutrient-dense carbs', vi: 'Carb giàu dinh dưỡng' },
          quantity: '200g',
        },
        {
          name: { en: 'Green Salad', vi: 'Salad rau xanh' },
          description: { en: 'Fresh vegetables', vi: 'Rau tươi' },
          quantity: '100g',
        },
      ],
      [MealType.SNACK]: [
        {
          name: { en: 'Greek Yogurt', vi: 'Sữa chua Hy Lạp' },
          description: { en: 'High protein snack', vi: 'Snack giàu protein' },
          quantity: '150g',
        },
        {
          name: { en: 'Almonds', vi: 'Hạnh nhân' },
          description: { en: 'Healthy fats', vi: 'Chất béo lành mạnh' },
          quantity: '30g',
        },
      ],
    };

    return templates[type].map((item, index) => ({
      ...item,
      macros: {
        calories: Math.round((protein * 4 + carbs * 4 + fat * 9) / templates[type].length),
        protein: index === 0 ? protein : Math.round(protein / templates[type].length),
        carbs: Math.round(carbs / templates[type].length),
        fat: Math.round(fat / templates[type].length),
      },
    }));
  }

  private async generateMealScheduleWithAI(
    days: DayOfWeek[],
    tdeeData: { targetCalories: number; protein: number; carbs: number; fat: number },
    goal: Goal,
  ): Promise<MealPlan['schedule']> {
    const prompt = this.buildMealPlanPrompt(days, tdeeData, goal);

    try {
      const aiResponse = await this.aiService.generateMealPlan(prompt);
      return aiResponse;
    } catch (error) {
      Logger.error('AI meal plan generation failed, falling back to templates:', error);
      // Fallback to template-based generation
      return this.generateMealSchedule(days, tdeeData);
    }
  }

  private buildMealPlanPrompt(
    days: DayOfWeek[],
    tdeeData: { targetCalories: number; protein: number; carbs: number; fat: number },
    goal: Goal,
  ): string {
    const goalDescriptions = {
      [Goal.MUSCLE_GAIN]: 'building muscle mass with a caloric surplus',
      [Goal.WEIGHT_LOSS]: 'losing weight with a caloric deficit',
      [Goal.MAINTENANCE]: 'maintaining current weight',
    };

    return `Generate a detailed meal plan with the following specifications:

**Goal**: ${goalDescriptions[goal]}
**Target Nutrition (Daily)**:
- Calories: ${tdeeData.targetCalories} kcal
- Protein: ${tdeeData.protein}g
- Carbs: ${tdeeData.carbs}g
- Fat: ${tdeeData.fat}g

**Days to Plan**: ${days.join(', ')}

**Requirements**:
1. Create 4 meals per day: Breakfast, Lunch, Dinner, and Snack
2. Each meal should have 2-3 food items
3. Provide bilingual names (English and Vietnamese)
4. Include portion sizes (e.g., "200g", "1 cup", "2 pieces")
5. Calculate accurate macros for each food item
6. Ensure daily totals match the target nutrition (±50 calories acceptable)
7. Include variety across different days
8. Consider meal timing for ${goal === Goal.MUSCLE_GAIN ? 'optimal muscle growth' : goal === Goal.WEIGHT_LOSS ? 'satiety and energy' : 'balanced nutrition'}

**Output Format** (JSON):
{
  "schedule": [
    {
      "dayOfWeek": "monday",
      "meals": [
        {
          "type": "breakfast",
          "items": [
            {
              "name": { "en": "Scrambled Eggs", "vi": "Trứng bác" },
              "description": { "en": "High protein breakfast", "vi": "Bữa sáng giàu protein" },
              "quantity": "3 eggs (150g)",
              "macros": { "calories": 210, "protein": 18, "carbs": 2, "fat": 14 }
            }
          ]
        }
      ]
    }
  ]
}

Generate a comprehensive, nutritionally balanced meal plan that helps achieve the ${goalDescriptions[goal]} goal.`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
