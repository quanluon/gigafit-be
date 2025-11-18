import { Controller, Get, Post, Body, Req, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { GenerationType } from '../../common/enums';
import { MealPlan } from '../../repositories';
import { MealService } from './meal.service';
import { GenerateMealPlanDto } from './dto/generate-meal-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueService } from '../queue/queue.service';
import { SubscriptionGuard, GenerationTypeDecorator } from '../user/guards/subscription.guard';

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

interface JobResponse {
  jobId: string;
  message: string;
}
@ApiTags('meal')
@Controller('meal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MealController extends BaseController {
  constructor(
    private readonly mealService: MealService,
    private readonly queueService: QueueService,
  ) {
    super();
  }
  @Post('plan/generate')
  @UseGuards(SubscriptionGuard)
  @GenerationTypeDecorator(GenerationType.MEAL)
  @ApiOperation({ summary: 'Generate a meal plan (async - returns job ID)' })
  async generateMealPlan(
    @Req() req: RequestWithUser,
    @Body() generateMealPlanDto: GenerateMealPlanDto,
  ): Promise<ApiResponseType<JobResponse>> {
    const job = await this.queueService.addMealGenerationJob({
      userId: req.user.userId,
      scheduleDays: generateMealPlanDto.scheduleDays,
      fullWeek: generateMealPlanDto.fullWeek,
      notes: generateMealPlanDto.notes,
    });

    return this.success(
      {
        jobId: job.id?.toString() || '',
        message: 'Meal plan generation started. You will be notified when complete.',
      },
      'Job created successfully',
    );
  }
  @Get('plan/generate/status/:jobId')
  @ApiOperation({ summary: 'Get meal plan generation job status' })
  async getGenerationStatus(@Param('jobId') jobId: string): Promise<ApiResponseType<unknown>> {
    const status = await this.queueService.getMealJobStatus(jobId);
    return this.success(status);
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
