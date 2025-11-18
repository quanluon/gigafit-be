import { Controller, Get, Post, Body, Req, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { Award, WeightLog } from '../../repositories';
import { AnalyticsService } from './analytics.service';
import { LogWeightDto } from './dto/log-weight.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { userId: string };
}

interface WeightHistory {
  date: string;
  weight: number;
}

interface ProgressStats {
  totalSessions: number;
  completedSessions: number;
  totalWorkoutTime: number;
  averageWorkoutDuration: number;
  currentStreak: number;
}

interface ExercisePR {
  exerciseName: string;
  maxWeight: number;
  date: string;
}
@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController extends BaseController {
  constructor(private readonly analyticsService: AnalyticsService) {
    super();
  }
  @Get('weight-history')
  @ApiOperation({ summary: 'Get weight history' })
  async getWeightHistory(
    @Req() req: RequestWithUser,
    @Query('days') days?: string,
  ): Promise<ApiResponseType<WeightHistory[]>> {
    const history = await this.analyticsService.getWeightHistory(
      req.user.userId,
      days ? parseInt(days, 10) : 90,
    );
    return this.success(history);
  }
  @Post('weight')
  @ApiOperation({ summary: 'Log weight' })
  async logWeight(
    @Req() req: RequestWithUser,
    @Body() logWeightDto: LogWeightDto,
  ): Promise<ApiResponseType<WeightLog>> {
    const log = await this.analyticsService.logWeight(
      req.user.userId,
      logWeightDto.weight,
      logWeightDto.notes,
    );
    return this.success(log, 'Weight logged successfully');
  }
  @Get('progress')
  @ApiOperation({ summary: 'Get progress statistics' })
  async getProgressStats(@Req() req: RequestWithUser): Promise<ApiResponseType<ProgressStats>> {
    const stats = await this.analyticsService.getProgressStats(req.user.userId);
    return this.success(stats);
  }
  @Get('prs')
  @ApiOperation({ summary: 'Get personal records' })
  async getExercisePRs(@Req() req: RequestWithUser): Promise<ApiResponseType<ExercisePR[]>> {
    const prs = await this.analyticsService.getExercisePRs(req.user.userId);
    return this.success(prs);
  }
  @Get('awards')
  @ApiOperation({ summary: 'Get user awards' })
  async getAwards(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<Award[]>> {
    const awards = await this.analyticsService.getUserAwards(
      req.user.userId,
      limit ? parseInt(limit, 10) : 10,
    );
    return this.success(awards);
  }
  @Get('awards/top')
  @ApiOperation({ summary: 'Get top awards' })
  async getTopAwards(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<Award[]>> {
    const awards = await this.analyticsService.getTopAwards(
      req.user.userId,
      limit ? parseInt(limit, 10) : 5,
    );
    return this.success(awards);
  }
}
