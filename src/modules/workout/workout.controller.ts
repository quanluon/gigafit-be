import { Controller, Get, Post, Body, Req, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '@/common/base';
import { ApiResponse as ApiResponseType } from '@/common/interfaces';
import { DayOfWeek } from '@/common/enums';
import { WorkoutPlan, WorkoutDay } from '@/repositories';
import { WorkoutService } from './workout.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('workout')
@Controller('workout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkoutController extends BaseController {
  constructor(private readonly workoutService: WorkoutService) {
    super();
  }

  @Post('plan/generate')
  @ApiOperation({ summary: 'Generate a new workout plan' })
  async generatePlan(
    @Req() req: RequestWithUser,
    @Body() generatePlanDto: GeneratePlanDto,
  ): Promise<ApiResponseType<WorkoutPlan>> {
    const plan = await this.workoutService.generatePlan(req.user.userId, generatePlanDto);
    return this.success(plan, 'Workout plan generated successfully');
  }

  @Get('plan')
  @ApiOperation({ summary: 'Get current week workout plan' })
  async getCurrentPlan(@Req() req: RequestWithUser): Promise<ApiResponseType<WorkoutPlan>> {
    const plan = await this.workoutService.getCurrentPlan(req.user.userId);
    return this.success(plan);
  }

  @Get('plan/week')
  @ApiOperation({ summary: 'Get workout plan by week' })
  async getPlanByWeek(
    @Req() req: RequestWithUser,
    @Query('week') week: string,
    @Query('year') year: string,
  ): Promise<ApiResponseType<WorkoutPlan>> {
    const plan = await this.workoutService.getPlanByWeek(
      req.user.userId,
      parseInt(week, 10),
      parseInt(year, 10),
    );
    return this.success(plan);
  }

  @Get('plan/day')
  @ApiOperation({ summary: 'Get workout for specific day' })
  async getWorkoutByDay(
    @Req() req: RequestWithUser,
    @Query('day') day: DayOfWeek,
  ): Promise<ApiResponseType<WorkoutDay | null>> {
    const workout = await this.workoutService.getWorkoutByDay(req.user.userId, day);
    return this.success(workout);
  }
}
