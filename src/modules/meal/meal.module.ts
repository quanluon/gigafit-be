import { Module, forwardRef } from '@nestjs/common';
import { MealController } from './meal.controller';
import { MealService } from './meal.service';
import { TDEECalculatorService } from './services/tdee-calculator.service';
import { AIModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [AIModule, forwardRef(() => QueueModule), UserModule],
  controllers: [MealController],
  providers: [MealService, TDEECalculatorService],
  exports: [MealService, TDEECalculatorService],
})
export class MealModule {}
