import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '@common/base';
import { ApiResponse as ApiResponseType } from '@common/interfaces';
import { MealPlan } from '@/repositories';
import { MealService } from './meal.service';
import { GenerateMealPlanDto } from './dto/generate-meal-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { userId: string };
}

interface TDEEResponse {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}

@ApiTags('meal')
@Controller('meal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MealController extends BaseController {
  constructor(private readonly mealService: MealService) {
    super();
  }

  @Post('plan/generate')
  @ApiOperation({ summary: 'Generate a meal plan' })
  async generateMealPlan(
    @Req() req: RequestWithUser,
    @Body() generateMealPlanDto: GenerateMealPlanDto,
  ): Promise<ApiResponseType<MealPlan>> {
    const plan = await this.mealService.generateMealPlan(
      req.user.userId,
      generateMealPlanDto.scheduleDays,
      generateMealPlanDto.useAI,
      generateMealPlanDto.fullWeek,
    );
    return this.success(plan, 'Meal plan generated successfully');
  }

  @Get('plan')
  @ApiOperation({ summary: 'Get current week meal plan' })
  async getCurrentPlan(@Req() req: RequestWithUser): Promise<ApiResponseType<MealPlan>> {
    const plan = await this.mealService.getCurrentPlan(req.user.userId);
    return this.success(plan);
  }

  @Get('tdee')
  @ApiOperation({ summary: 'Calculate user TDEE and macros' })
  async calculateTDEE(@Req() req: RequestWithUser): Promise<ApiResponseType<TDEEResponse>> {
    const tdee = await this.mealService.calculateUserTDEE(req.user.userId);
    return this.success(tdee);
  }
}
