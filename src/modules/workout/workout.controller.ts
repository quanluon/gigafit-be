import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { DayOfWeek, GenerationType } from '../../common/enums';
import { WorkoutPlan, WorkoutDay } from '../../repositories';
import { WorkoutService } from './workout.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueService } from '../queue/queue.service';
import { SubscriptionGuard, GenerationTypeDecorator } from '../user/guards/subscription.guard';
import { CreateCustomPlanDto, UpdateCustomPlanDto } from './dto/custom-plan.dto';

interface RequestWithUser extends Request {
  user: { userId: string };
}

interface JobResponse {
  jobId: string;
  message: string;
}
@ApiTags('workout')
@Controller('workout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkoutController extends BaseController {
  constructor(
    private readonly workoutService: WorkoutService,
    private readonly queueService: QueueService,
  ) {
    super();
  }
  @Post('plan/generate')
  @UseGuards(SubscriptionGuard)
  @GenerationTypeDecorator(GenerationType.WORKOUT)
  @ApiOperation({ summary: 'Generate a new workout plan (async - returns job ID)' })
  async generatePlan(
    @Req() req: RequestWithUser,
    @Body() generatePlanDto: GeneratePlanDto,
  ): Promise<ApiResponseType<JobResponse>> {
    const job = await this.queueService.addWorkoutGenerationJob({
      userId: req.user.userId,
      ...generatePlanDto,
    });

    return this.success(
      {
        jobId: job.id?.toString() || '',
        message: 'Workout plan generation started. You will be notified when complete.',
      },
      'Job created successfully',
    );
  }
  @Get('plan/generate/status/:jobId')
  @ApiOperation({ summary: 'Get workout plan generation job status' })
  async getGenerationStatus(@Param('jobId') jobId: string): Promise<ApiResponseType<unknown>> {
    const status = await this.queueService.getJobStatus(jobId);
    return this.success(status);
  }
  @Get('plan/generate/jobs')
  @ApiOperation({ summary: 'Get all active generation jobs for current user' })
  async getActiveJobs(@Req() req: RequestWithUser): Promise<ApiResponseType<unknown>> {
    const jobs = await this.queueService.getUserActiveJobs(req.user.userId);
    return this.success(jobs);
  }
  @Get('plan')
  @ApiOperation({ summary: 'Get current week workout plan' })
  async getCurrentPlan(@Req() req: RequestWithUser): Promise<ApiResponseType<WorkoutPlan | null>> {
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
  @Post('plan/custom')
  @ApiOperation({ summary: 'Create or replace a custom workout plan' })
  async createCustomPlan(
    @Req() req: RequestWithUser,
    @Body() dto: CreateCustomPlanDto,
  ): Promise<ApiResponseType<WorkoutPlan>> {
    const plan = await this.workoutService.createCustomPlan(req.user.userId, dto);
    return this.success(plan, 'Custom workout plan saved');
  }
  @Patch('plan/:planId')
  @ApiOperation({ summary: 'Update an existing workout plan' })
  async updatePlan(
    @Req() req: RequestWithUser,
    @Param('planId') planId: string,
    @Body() dto: UpdateCustomPlanDto,
  ): Promise<ApiResponseType<WorkoutPlan>> {
    const plan = await this.workoutService.updatePlan(req.user.userId, planId, dto);
    return this.success(plan, 'Workout plan updated');
  }
  @Delete('plan/:planId')
  @ApiOperation({ summary: 'Delete an existing workout plan' })
  async deletePlan(
    @Req() req: RequestWithUser,
    @Param('planId') planId: string,
  ): Promise<ApiResponseType<{ success: boolean }>> {
    const deleted = await this.workoutService.deletePlan(req.user.userId, planId);
    return this.success({ success: deleted });
  }
}
