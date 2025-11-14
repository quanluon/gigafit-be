import { Controller, Get, Post, Patch, Body, Param, Req, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { SessionStatus } from '../../common/enums';
import { TrainingSession } from '../../repositories';
import { TrainingService } from './training.service';
import { StartSessionDto } from './dto/start-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { LogExerciseDto } from './dto/log-exercise.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('training')
@Controller('training')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TrainingController extends BaseController {
  constructor(private readonly trainingService: TrainingService) {
    super();
  }

  @Post('session/start')
  @ApiOperation({ summary: 'Start a new training session' })
  async startSession(
    @Req() req: RequestWithUser,
    @Body() startSessionDto: StartSessionDto,
  ): Promise<ApiResponseType<TrainingSession>> {
    const session = await this.trainingService.startSession(req.user.userId, startSessionDto);
    return this.success(session, 'Training session started');
  }

  @Get('session/active')
  @ApiOperation({ summary: 'Get active training session' })
  async getActiveSession(
    @Req() req: RequestWithUser,
  ): Promise<ApiResponseType<TrainingSession | null>> {
    const session = await this.trainingService.getActiveSession(req.user.userId);
    return this.success(session);
  }

  @Get('session/:id')
  @ApiOperation({ summary: 'Get training session by ID' })
  async getSession(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<ApiResponseType<TrainingSession>> {
    const session = await this.trainingService.getSessionById(req.user.userId, id);
    return this.success(session);
  }

  @Patch('session/:id')
  @ApiOperation({ summary: 'Update training session' })
  async updateSession(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ): Promise<ApiResponseType<TrainingSession>> {
    const session = await this.trainingService.updateSession(req.user.userId, id, updateSessionDto);
    return this.success(session, 'Session updated');
  }

  @Post('session/:id/log')
  @ApiOperation({ summary: 'Log exercises in training session' })
  async logExercise(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() logExerciseDto: LogExerciseDto,
  ): Promise<ApiResponseType<TrainingSession>> {
    const session = await this.trainingService.logExercise(req.user.userId, id, logExerciseDto);
    return this.success(session, 'Exercise logged');
  }

  @Post('session/:id/complete')
  @ApiOperation({ summary: 'Complete training session' })
  async completeSession(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<ApiResponseType<TrainingSession>> {
    const session = await this.trainingService.completeSession(req.user.userId, id);
    return this.success(session, 'Session completed');
  }

  @Post('session/:id/cancel')
  @ApiOperation({ summary: 'Cancel training session' })
  async cancelSession(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ): Promise<ApiResponseType<TrainingSession>> {
    const session = await this.trainingService.cancelSession(req.user.userId, id);
    return this.success(session, 'Session cancelled');
  }

  @Get('sessions/recent')
  @ApiOperation({ summary: 'Get recent training sessions' })
  async getRecentSessions(
    @Req() req: RequestWithUser,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<TrainingSession[]>> {
    const sessions = await this.trainingService.getRecentSessions(
      req.user.userId,
      limit ? parseInt(limit, 10) : 10,
    );
    return this.success(sessions);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all user training sessions' })
  async getUserSessions(
    @Req() req: RequestWithUser,
    @Query('status') status?: SessionStatus,
  ): Promise<ApiResponseType<TrainingSession[]>> {
    const sessions = status
      ? await this.trainingService.getSessionsByStatus(req.user.userId, status)
      : await this.trainingService.getUserSessions(req.user.userId);
    return this.success(sessions);
  }

  @Get('sessions/month/:year/:month')
  @ApiOperation({ summary: 'Get training sessions for a specific month' })
  async getSessionsByMonth(
    @Req() req: RequestWithUser,
    @Param('year') year: string,
    @Param('month') month: string,
  ): Promise<ApiResponseType<TrainingSession[]>> {
    const sessions = await this.trainingService.getSessionsByMonth(
      req.user.userId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
    return this.success(sessions);
  }
}
