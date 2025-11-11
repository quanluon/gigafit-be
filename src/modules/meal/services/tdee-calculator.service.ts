import { Injectable } from '@nestjs/common';
import { Goal, ActivityLevel, Gender } from '@common/enums';

interface TDEECalculation {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

@Injectable()
export class TDEECalculatorService {
  /**
   * Calculate BMR using Mifflin-St Jeor Equation
   * Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + 5
   * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) - 161
   */
  calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
    const baseBMR = 10 * weight + 6.25 * height - 5 * age;

    if (gender === Gender.MALE) {
      return baseBMR + 5;
    } else if (gender === Gender.FEMALE) {
      return baseBMR - 161;
    } else {
      // Average for Gender.OTHER
      return baseBMR - 78;
    }
  }

  /**
   * Calculate TDEE based on activity level
   */
  calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
    const activityMultipliers: Record<ActivityLevel, number> = {
      [ActivityLevel.SEDENTARY]: 1.2,
      [ActivityLevel.LIGHTLY_ACTIVE]: 1.375,
      [ActivityLevel.MODERATELY_ACTIVE]: 1.55,
      [ActivityLevel.VERY_ACTIVE]: 1.725,
      [ActivityLevel.EXTREMELY_ACTIVE]: 1.9,
    };

    return Math.round(bmr * activityMultipliers[activityLevel]);
  }

  /**
   * Calculate target calories based on goal
   */
  calculateTargetCalories(tdee: number, goal: Goal): number {
    const adjustments: Record<Goal, number> = {
      [Goal.WEIGHT_LOSS]: -500, // 500 calorie deficit for ~0.5kg/week loss
      [Goal.MUSCLE_GAIN]: 300, // 300 calorie surplus for muscle gain
      [Goal.MAINTENANCE]: 0, // Maintenance calories
    };

    return Math.round(tdee + adjustments[goal]);
  }

  /**
   * Calculate macronutrients based on goal
   */
  calculateMacros(
    targetCalories: number,
    goal: Goal,
    weight: number,
  ): { protein: number; carbs: number; fat: number } {
    // Protein: 1.8-2.2g per kg for muscle gain, 1.6-2g for weight loss, 1.6g for maintenance
    let proteinGrams: number;
    if (goal === Goal.MUSCLE_GAIN) {
      proteinGrams = weight * 2.0;
    } else if (goal === Goal.WEIGHT_LOSS) {
      proteinGrams = weight * 2.0;
    } else {
      proteinGrams = weight * 1.6;
    }

    // Fat: 25-30% of total calories
    const fatCalories = targetCalories * 0.25;
    const fatGrams = fatCalories / 9; // 9 calories per gram of fat

    // Carbs: Remaining calories
    const proteinCalories = proteinGrams * 4; // 4 calories per gram of protein
    const remainingCalories = targetCalories - proteinCalories - fatCalories;
    const carbGrams = remainingCalories / 4; // 4 calories per gram of carbs

    return {
      protein: Math.round(proteinGrams),
      carbs: Math.round(carbGrams),
      fat: Math.round(fatGrams),
    };
  }

  /**
   * Complete TDEE and macros calculation
   */
  calculateComplete(
    weight: number,
    height: number,
    age: number,
    gender: Gender,
    activityLevel: ActivityLevel,
    goal: Goal,
  ): TDEECalculation {
    const bmr = this.calculateBMR(weight, height, age, gender);
    const tdee = this.calculateTDEE(bmr, activityLevel);
    const targetCalories = this.calculateTargetCalories(tdee, goal);
    const macros = this.calculateMacros(targetCalories, goal, weight);

    return {
      bmr,
      tdee,
      targetCalories,
      ...macros,
    };
  }
}
