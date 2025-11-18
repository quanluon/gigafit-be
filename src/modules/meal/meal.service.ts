import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { MealPlanRepository, MealPlan, InbodyResultRepository } from '../../repositories';
import { UserRepository } from '../../repositories';
import { TDEECalculatorService } from './services/tdee-calculator.service';
import { DayOfWeek, MealType, Goal } from '../../common/enums';
import { InbodyAnalysis, Translatable } from '../../common/interfaces';
import { AIService } from '../ai/ai.service';

const FULL_WEEK_DAYS: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

const MEAL_CALORIE_SPLIT: Record<MealType, number> = {
  [MealType.BREAKFAST]: 0.3,
  [MealType.LUNCH]: 0.35,
  [MealType.DINNER]: 0.3,
  [MealType.SNACK]: 0.05,
};

interface MealTemplateComponent {
  name: Translatable;
  notes?: Translatable;
  portionRatio?: number;
}

interface MealTemplateItem {
  name: { en: string; vi: string };
  description: { en: string; vi: string };
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  calorieShare: number;
  minGrams?: number;
  components?: MealTemplateComponent[];
}

const MEAL_ITEM_LIBRARY: Record<MealType, MealTemplateItem[]> = {
  [MealType.BREAKFAST]: [
    {
      name: { en: 'Rolled oats', vi: 'Yến mạch' },
      description: {
        en: 'Whole oats cooked with milk or water',
        vi: 'Yến mạch nấu với sữa hoặc nước',
      },
      caloriesPer100g: 380,
      proteinPer100g: 13,
      carbsPer100g: 69,
      fatPer100g: 7,
      calorieShare: 0.45,
      components: [
        {
          name: { en: 'Rolled oats', vi: 'Yến mạch cán mỏng' },
          portionRatio: 0.75,
        },
        {
          name: { en: 'Unsweetened milk/water', vi: 'Sữa/ nước không đường' },
          portionRatio: 0.25,
          notes: {
            en: 'Use warm water or low-fat milk, no added sugar',
            vi: 'Dùng nước ấm hoặc sữa ít béo, không thêm đường',
          },
        },
      ],
    },
    {
      name: { en: 'Egg whites & yolks', vi: 'Trứng gà' },
      description: {
        en: 'Scrambled or boiled eggs',
        vi: 'Trứng bác hoặc luộc',
      },
      caloriesPer100g: 155,
      proteinPer100g: 13,
      carbsPer100g: 1,
      fatPer100g: 11,
      calorieShare: 0.35,
      components: [
        {
          name: { en: 'Free-range eggs', vi: 'Trứng gà ta' },
          portionRatio: 1,
          notes: {
            en: 'Soft-boiled or scramble with minimal oil',
            vi: 'Luộc hoặc chiên ít dầu',
          },
        },
      ],
    },
    {
      name: { en: 'Banana', vi: 'Chuối' },
      description: {
        en: 'Fresh fruit for energy',
        vi: 'Trái cây tươi bổ sung năng lượng',
      },
      caloriesPer100g: 89,
      proteinPer100g: 1,
      carbsPer100g: 23,
      fatPer100g: 0.3,
      calorieShare: 0.2,
      components: [
        {
          name: { en: 'Banana', vi: 'Chuối chín' },
          portionRatio: 1,
        },
      ],
    },
  ],
  [MealType.LUNCH]: [
    {
      name: { en: 'Grilled chicken breast', vi: 'Ức gà nướng' },
      description: {
        en: 'Lean protein source',
        vi: 'Nguồn protein nạc',
      },
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
      calorieShare: 0.45,
      components: [
        {
          name: { en: 'Skinless chicken breast', vi: 'Ức gà bỏ da' },
          portionRatio: 0.9,
          notes: {
            en: 'Grill or pan-sear with olive oil spray',
            vi: 'Nướng hoặc áp chảo với dầu ô-liu xịt',
          },
        },
        {
          name: { en: 'Herbs & spices', vi: 'Gia vị thảo mộc' },
          portionRatio: 0.1,
          notes: {
            en: 'Garlic, pepper, minimal salt',
            vi: 'Tỏi, tiêu, ít muối',
          },
        },
      ],
    },
    {
      name: { en: 'Brown rice', vi: 'Cơm gạo lứt' },
      description: {
        en: 'Complex carbohydrates',
        vi: 'Carb phức hợp',
      },
      caloriesPer100g: 123,
      proteinPer100g: 3,
      carbsPer100g: 26,
      fatPer100g: 1,
      calorieShare: 0.35,
      components: [
        {
          name: { en: 'Cooked brown rice', vi: 'Gạo lứt nấu chín' },
          portionRatio: 1,
        },
      ],
    },
    {
      name: { en: 'Mixed vegetables', vi: 'Rau củ' },
      description: {
        en: 'Seasonal vegetables and greens',
        vi: 'Rau củ theo mùa',
      },
      caloriesPer100g: 40,
      proteinPer100g: 3,
      carbsPer100g: 8,
      fatPer100g: 0.5,
      calorieShare: 0.2,
      components: [
        {
          name: { en: 'Steamed veggies', vi: 'Rau hấp/chần' },
          portionRatio: 1,
          notes: {
            en: 'Broccoli, carrots, bok choy',
            vi: 'Bông cải, cà rốt, cải thìa',
          },
        },
      ],
    },
  ],
  [MealType.DINNER]: [
    {
      name: { en: 'Salmon fillet', vi: 'Cá hồi' },
      description: {
        en: 'Omega-3 rich protein',
        vi: 'Protein giàu Omega-3',
      },
      caloriesPer100g: 208,
      proteinPer100g: 20,
      carbsPer100g: 0,
      fatPer100g: 13,
      calorieShare: 0.45,
      components: [
        {
          name: { en: 'Atlantic salmon', vi: 'Phi lê cá hồi' },
          portionRatio: 1,
          notes: {
            en: 'Grill or air-fry, no heavy sauce',
            vi: 'Nướng hoặc chiên không khí, không sốt béo',
          },
        },
      ],
    },
    {
      name: { en: 'Roasted sweet potato', vi: 'Khoai lang nướng' },
      description: {
        en: 'Slow carbs for sustained energy',
        vi: 'Carb giải phóng chậm',
      },
      caloriesPer100g: 86,
      proteinPer100g: 2,
      carbsPer100g: 20,
      fatPer100g: 0.1,
      calorieShare: 0.35,
      components: [
        {
          name: { en: 'Sweet potato', vi: 'Khoai lang' },
          portionRatio: 1,
          notes: {
            en: 'Roast or steam without extra sugar',
            vi: 'Nướng hoặc hấp, không thêm đường',
          },
        },
      ],
    },
    {
      name: { en: 'Green salad', vi: 'Salad rau xanh' },
      description: {
        en: 'Fiber and micronutrients',
        vi: 'Chất xơ và vi chất',
      },
      caloriesPer100g: 25,
      proteinPer100g: 2,
      carbsPer100g: 4,
      fatPer100g: 0.1,
      calorieShare: 0.2,
      components: [
        {
          name: { en: 'Mixed greens', vi: 'Rau xanh hỗn hợp' },
          portionRatio: 0.8,
        },
        {
          name: { en: 'Light dressing', vi: 'Sốt giấm nhẹ' },
          portionRatio: 0.2,
          notes: {
            en: 'Olive oil + vinegar, no sugar',
            vi: 'Dầu ô-liu và giấm, không đường',
          },
        },
      ],
    },
  ],
  [MealType.SNACK]: [
    {
      name: { en: 'Greek yogurt', vi: 'Sữa chua Hy Lạp' },
      description: {
        en: 'High protein snack',
        vi: 'Snack giàu protein',
      },
      caloriesPer100g: 59,
      proteinPer100g: 10,
      carbsPer100g: 3.6,
      fatPer100g: 0.4,
      calorieShare: 0.6,
      components: [
        {
          name: { en: 'Plain Greek yogurt', vi: 'Sữa chua Hy Lạp' },
          portionRatio: 1,
        },
      ],
    },
    {
      name: { en: 'Almonds', vi: 'Hạnh nhân' },
      description: {
        en: 'Healthy fats',
        vi: 'Chất béo lành mạnh',
      },
      caloriesPer100g: 579,
      proteinPer100g: 21,
      carbsPer100g: 22,
      fatPer100g: 50,
      calorieShare: 0.4,
      minGrams: 20,
      components: [
        {
          name: { en: 'Roasted almonds', vi: 'Hạnh nhân rang' },
          portionRatio: 1,
          notes: {
            en: 'Unsalted, dry roasted',
            vi: 'Rang khô không muối',
          },
        },
      ],
    },
  ],
};

@Injectable()
export class MealService {
  private readonly logger = new Logger(MealService.name);
  constructor(
    private readonly mealPlanRepository: MealPlanRepository,
    private readonly userRepository: UserRepository,
    private readonly tdeeCalculator: TDEECalculatorService,
    private readonly aiService: AIService,
    private readonly inbodyResultRepository: InbodyResultRepository,
  ) {}
  async generateMealPlan(userId: string, notes?: string): Promise<MealPlan> {
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

    // Determine days to generate meals for (always ensure full week order)
    const generationDays = FULL_WEEK_DAYS;

    // Generate meal schedule
    const latestInbody = await this.inbodyResultRepository.findLatestCompleted(userId);

    const schedule = await this.generateMealScheduleWithAI(
      generationDays,
      tdeeData,
      user.goal,
      notes,
      ((): string | undefined => {
        if (!latestInbody?.aiAnalysis) return undefined;
        const analysis = latestInbody.aiAnalysis;
        // Old format: Translatable (en/vi are strings)
        if (
          typeof analysis === 'object' &&
          analysis !== null &&
          'en' in analysis &&
          'vi' in analysis &&
          typeof (analysis as { en: unknown }).en === 'string' &&
          typeof (analysis as { vi: unknown }).vi === 'string'
        ) {
          const translatable = analysis as { en: string; vi: string };
          return translatable.en || translatable.vi;
        }
        // New format: Structured object (InbodyAnalysis)
        if (
          typeof analysis === 'object' &&
          analysis !== null &&
          'en' in analysis &&
          'vi' in analysis &&
          typeof (analysis as { en: unknown }).en === 'object' &&
          (analysis as { en: unknown }).en !== null &&
          'body_composition_summary' in ((analysis as { en: unknown }).en as object)
        ) {
          const structured = analysis as InbodyAnalysis;
          return structured.en.body_composition_summary || structured.vi.body_composition_summary;
        }
        return undefined;
      })(),
    );

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
    return days.map((day) => {
      const meals = this.generateDailyMeals(tdeeData.targetCalories);
      return {
        dayOfWeek: day,
        meals,
        dailyTotals: this.calculateDailyTotals(meals),
      };
    });
  }
  private generateDailyMeals(targetCalories: number): MealPlan['schedule'][0]['meals'] {
    return (Object.entries(MEAL_CALORIE_SPLIT) as Array<[MealType, number]>).map(
      ([mealType, ratio]) => {
        const caloriesForMeal = Math.round(targetCalories * ratio);
        const items = this.buildMealItems(mealType as MealType, caloriesForMeal);
        return {
          type: mealType as MealType,
          items,
          totalMacros: this.calculateMealTotals(items),
        };
      },
    );
  }
  private async generateMealScheduleWithAI(
    days: DayOfWeek[],
    tdeeData: { targetCalories: number; protein: number; carbs: number; fat: number },
    goal: Goal,
    notes?: string,
    inbodySummary?: string,
  ): Promise<MealPlan['schedule']> {
    const prompt = this.buildMealPlanPrompt(days, tdeeData, goal, notes, inbodySummary);

    try {
      const aiResponse = await this.aiService.generateMealPlan(prompt);
      this.logger.debug('AI meal plan generated successfully');
      return this.normalizeAiSchedule(aiResponse as MealPlan['schedule'], days, tdeeData);
    } catch (error) {
      this.logger.error('AI meal plan generation failed, falling back to templates:', error);
      // Fallback to template-based generation
      return this.generateMealSchedule(days, tdeeData);
    }
  }
  private buildMealPlanPrompt(
    days: DayOfWeek[],
    tdeeData: { targetCalories: number; protein: number; carbs: number; fat: number },
    goal: Goal,
    notes?: string,
    inbodySummary?: string,
  ): string {
    const goalMap = {
      [Goal.MUSCLE_GAIN]: 'muscle gain',
      [Goal.WEIGHT_LOSS]: 'fat loss',
      [Goal.MAINTENANCE]: 'maintenance',
    };

    let prompt = `Generate meal plan:

Goal: ${goalMap[goal]}
Daily: ${tdeeData.targetCalories} kcal, P${tdeeData.protein}g, C${tdeeData.carbs}g, F${tdeeData.fat}g
Days: ${days.join(', ')}`;

    if (inbodySummary) {
      prompt += `\nInBody: ${inbodySummary.slice(0, 150)}`;
    }
    if (notes) {
      prompt += `\nNotes: ${notes.slice(0, 100)}`;
    }
    prompt += `

4 meals/day (breakfast/lunch/dinner/snack), 2-3 items each
Bilingual names (en/vi), portions, accurate macros
Vietnamese cuisine, variety, ±50 kcal daily target`;

    return prompt;
  }
  private buildMealItems(
    type: MealType,
    mealCalories: number,
  ): MealPlan['schedule'][0]['meals'][0]['items'] {
    const templates = MEAL_ITEM_LIBRARY[type] || [];
    if (!templates.length) {
      return [];
    }
    const allocations = templates.map((template) =>
      Math.round(mealCalories * template.calorieShare),
    );
    const totalAllocated = allocations.reduce((sum, value) => sum + value, 0);
    const diff = mealCalories - totalAllocated;
    allocations[allocations.length - 1] += diff;

    return templates.map((template, index) => {
      const allocatedCalories = Math.max(0, allocations[index]);
      const grams = Math.max(
        template.minGrams ?? 25,
        Math.round((allocatedCalories / template.caloriesPer100g) * 100),
      );
      const scalingFactor = grams / 100;

      const components = this.buildMealComponents(template, grams);

      return {
        name: template.name,
        description: template.description,
        quantity: `${grams}g`,
        macros: {
          calories: Math.round(template.caloriesPer100g * scalingFactor),
          protein: Math.round(template.proteinPer100g * scalingFactor),
          carbs: Math.round(template.carbsPer100g * scalingFactor),
          fat: Math.round(template.fatPer100g * scalingFactor),
        },
        components,
      };
    });
  }
  private buildMealComponents(
    template: MealTemplateItem,
    totalGrams: number,
  ): NonNullable<MealPlan['schedule'][0]['meals'][0]['items'][0]['components']> {
    const definitions =
      template.components && template.components.length > 0
        ? template.components
        : [{ name: template.name, portionRatio: 1, notes: template.description }];

    const normalizedRatioSum = definitions.reduce(
      (sum, comp) => sum + (comp.portionRatio && comp.portionRatio > 0 ? comp.portionRatio : 0),
      0,
    );
    const fallbackRatio = normalizedRatioSum > 0 ? normalizedRatioSum : definitions.length;

    return definitions.map((component) => {
      const ratio =
        component.portionRatio && component.portionRatio > 0
          ? component.portionRatio
          : 1 / definitions.length;
      const grams = Math.max(5, Math.round((ratio / fallbackRatio) * totalGrams));
      const note = component.notes || template.description;
      return {
        name: component.name,
        quantity: `${grams}g`,
        notes: note || {
          en: '',
          vi: '',
        },
      };
    });
  }
  private calculateMealTotals(items: MealPlan['schedule'][0]['meals'][0]['items']): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    return items.reduce(
      (totals, item) => ({
        calories: totals.calories + (item.macros?.calories || 0),
        protein: totals.protein + (item.macros?.protein || 0),
        carbs: totals.carbs + (item.macros?.carbs || 0),
        fat: totals.fat + (item.macros?.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }
  private calculateDailyTotals(meals: MealPlan['schedule'][0]['meals']): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    return meals.reduce(
      (totals, meal) => ({
        calories: totals.calories + (meal.totalMacros?.calories || 0),
        protein: totals.protein + (meal.totalMacros?.protein || 0),
        carbs: totals.carbs + (meal.totalMacros?.carbs || 0),
        fat: totals.fat + (meal.totalMacros?.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }
  private normalizeAiSchedule(
    aiSchedule: MealPlan['schedule'],
    days: DayOfWeek[],
    tdeeData: { targetCalories: number; protein: number; carbs: number; fat: number },
  ): MealPlan['schedule'] {
    const dayMap = new Map<DayOfWeek, MealPlan['schedule'][0]>();
    aiSchedule.forEach((dayPlan) => {
      const normalizedDay = this.toDayOfWeek(dayPlan.dayOfWeek);
      if (normalizedDay) {
        dayMap.set(normalizedDay, dayPlan);
      }
    });

    return days.map((day) => {
      const aiDay = dayMap.get(day);
      const meals = this.normalizeAiMeals(aiDay?.meals, tdeeData.targetCalories);
      return {
        dayOfWeek: day,
        meals,
        dailyTotals: this.calculateDailyTotals(meals),
      };
    });
  }
  private normalizeAiMeals(
    aiMeals: MealPlan['schedule'][0]['meals'] | undefined,
    targetCalories: number,
  ): MealPlan['schedule'][0]['meals'] {
    const orderedMeals: MealType[] = [
      MealType.BREAKFAST,
      MealType.LUNCH,
      MealType.DINNER,
      MealType.SNACK,
    ];

    return orderedMeals.map((mealType) => {
      const aiMeal = aiMeals?.find((meal) => meal.type === mealType);
      return this.normalizeAiMeal(mealType, aiMeal, targetCalories);
    });
  }
  private normalizeAiMeal(
    mealType: MealType,
    aiMeal: MealPlan['schedule'][0]['meals'][0] | undefined,
    targetCalories: number,
  ): MealPlan['schedule'][0]['meals'][0] {
    const desiredCalories = Math.round(targetCalories * MEAL_CALORIE_SPLIT[mealType]);

    if (!aiMeal || !aiMeal.items?.length) {
      const fallbackItems = this.buildMealItems(mealType, desiredCalories);
      return {
        type: mealType,
        items: fallbackItems,
        totalMacros: this.calculateMealTotals(fallbackItems),
      };
    }
    const normalizedItems = this.normalizeAiMealItems(mealType, aiMeal.items, desiredCalories);
    return {
      type: (aiMeal.type as MealType) || mealType,
      items: normalizedItems,
      totalMacros: this.calculateMealTotals(normalizedItems),
    };
  }
  private normalizeAiMealItems(
    mealType: MealType,
    aiItems: MealPlan['schedule'][0]['meals'][0]['items'],
    desiredCalories: number,
  ): MealPlan['schedule'][0]['meals'][0]['items'] {
    const cleanedItems = aiItems.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: this.ensureQuantityInGrams(item.quantity),
      macros: {
        calories: item.macros?.calories ?? 0,
        protein: item.macros?.protein ?? 0,
        carbs: item.macros?.carbs ?? 0,
        fat: item.macros?.fat ?? 0,
      },
      components: this.normalizeComponents(item.components, item.quantity, item.name),
    }));

    const currentCalories = cleanedItems.reduce((sum, item) => sum + item.macros.calories, 0);

    if (currentCalories <= 0) {
      return this.buildMealItems(mealType, desiredCalories);
    }
    const scale = desiredCalories / currentCalories;
    const scaledItems = cleanedItems.map((item) => ({
      ...item,
      macros: {
        calories: Math.max(0, Math.round(item.macros.calories * scale)),
        protein: Math.max(0, Math.round(item.macros.protein * scale)),
        carbs: Math.max(0, Math.round(item.macros.carbs * scale)),
        fat: Math.max(0, Math.round(item.macros.fat * scale)),
      },
    }));

    const total = this.calculateMealTotals(scaledItems);
    const calorieDiff = desiredCalories - total.calories;
    if (calorieDiff !== 0 && scaledItems.length > 0) {
      scaledItems[scaledItems.length - 1].macros.calories += calorieDiff;
    }
    return scaledItems;
  }
  private ensureQuantityInGrams(quantity?: string): string {
    if (!quantity) {
      return '100g';
    }
    const trimmed = quantity.trim();
    if (/\d+\s*(g|gram|grams)/i.test(trimmed)) {
      return trimmed;
    }
    if (/\d+/.test(trimmed)) {
      return `${trimmed} g`;
    }
    return `${trimmed} (100g)`;
  }
  private toDayOfWeek(value: string): DayOfWeek | null {
    const normalized = value?.toLowerCase() as DayOfWeek | undefined;
    if (normalized && FULL_WEEK_DAYS.includes(normalized)) {
      return normalized;
    }
    return null;
  }
  private normalizeComponents(
    components: MealPlan['schedule'][0]['meals'][0]['items'][0]['components'] | undefined,
    fallbackQuantity?: string,
    fallbackName?: Translatable,
  ): NonNullable<MealPlan['schedule'][0]['meals'][0]['items'][0]['components']> {
    const ensureName = fallbackName ?? {
      en: 'Ingredient',
      vi: 'Nguyên liệu',
    };
    const fallbackNote = fallbackName
      ? {
          en: fallbackName.en,
          vi: fallbackName.vi || fallbackName.en,
        }
      : { en: '', vi: '' };

    const normalized =
      components && components.length > 0
        ? components
        : [
            {
              name: ensureName,
              quantity: fallbackQuantity || '100g',
              notes: fallbackNote,
            },
          ];

    return normalized.map((component) => ({
      name: component.name || ensureName,
      quantity: this.ensureQuantityInGrams(component.quantity),
      notes: component.notes || fallbackNote,
    }));
  }
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
