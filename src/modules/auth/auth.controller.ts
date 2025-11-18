import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse as ApiResponseType } from '../../common/interfaces';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, RefreshResponseDto } from './dto/auth-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { BaseController } from '../../common';

@ApiTags('auth')
@Controller('auth')
export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponseType<AuthResponseDto>> {
    const result = await this.authService.register(registerDto);
    return this.success(result, 'User registered successfully');
  }
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() loginDto: LoginDto): Promise<ApiResponseType<AuthResponseDto>> {
    const result = await this.authService.login(loginDto);
    return this.success(result, 'User logged in successfully');
  }
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<ApiResponseType<RefreshResponseDto>> {
    const tokens = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    return this.success(tokens, 'Token refreshed successfully');
  }
}
