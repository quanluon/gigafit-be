import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../common/base';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { User } from '../../repositories';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('user')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController extends BaseController {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getProfile(@Req() req: RequestWithUser): Promise<ApiResponseType<User>> {
    const user = await this.userService.findById(req.user.userId);
    return this.success(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateProfile(
    @Req() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponseType<User>> {
    const user = await this.userService.update(req.user.userId, updateUserDto);
    return this.success(user, 'Profile updated successfully');
  }

  @Get('profile/complete')
  @ApiOperation({ summary: 'Check if user profile is complete' })
  @ApiResponse({ status: 200, description: 'Profile completion status' })
  async isProfileComplete(
    @Req() req: RequestWithUser,
  ): Promise<ApiResponseType<{ isComplete: boolean }>> {
    const user = await this.userService.findById(req.user.userId);
    const isComplete = await this.userService.isProfileComplete(user);
    return this.success({ isComplete });
  }
}
