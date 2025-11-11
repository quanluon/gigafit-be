import { Module } from '@nestjs/common';
import { MealController } from './meal.controller';
import { MealService } from './meal.service';
import { TDEECalculatorService } from './services/tdee-calculator.service';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [AIModule],
  controllers: [MealController],
  providers: [MealService, TDEECalculatorService],
  exports: [MealService, TDEECalculatorService],
})
export class MealModule {}

