import { Controller, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponse as ApiResponseType } from 'src/common/interfaces';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { BaseController } from 'src/common';

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
}
