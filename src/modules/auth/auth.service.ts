import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  AdminConfirmSignUpCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import { User } from '../../repositories';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private clientId: string;
  private userPoolId: string;
  private autoConfirmUser: boolean = true;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('aws.region'),
    });
    this.clientId = this.configService.get<string>('aws.cognito.clientId') || '';
    this.userPoolId = this.configService.get<string>('aws.cognito.userPoolId') || '';
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Register user in Cognito
    const signUpCommand = new SignUpCommand({
      ClientId: this.clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
      ],
    });

    try {
      const response = await this.cognitoClient.send(signUpCommand);
      const cognitoSub = response.UserSub || '';

      // Auto-confirm user if enabled
      if (this.autoConfirmUser) {
        const confirmCommand = new AdminConfirmSignUpCommand({
          UserPoolId: this.userPoolId,
          Username: email,
        });
        await this.cognitoClient.send(confirmCommand);
      }

      // Create user in database
      const user = await this.userService.create({
        email,
        cognitoSub,
      });

      // Generate JWT token
      const accessToken = this.generateAccessToken(cognitoSub, email);

      // Generate refresh token
      const refreshToken = this.generateRefreshToken(cognitoSub, email);

      return {
        accessToken,
        refreshToken,
        user,
      };
    } catch (error) {
      throw new UnauthorizedException('Registration failed');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Authenticate with Cognito
    const authCommand = new InitiateAuthCommand({
      ClientId: this.clientId,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    try {
      const response = await this.cognitoClient.send(authCommand);
      const accessToken = response.AuthenticationResult?.AccessToken || '';

      // Get user info from Cognito
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken,
      });
      const cognitoUserData = await this.cognitoClient.send(getUserCommand);
      const cognitoSub = cognitoUserData.Username || '';

      // Extract email from Cognito attributes
      const emailAttribute = cognitoUserData.UserAttributes?.find((attr) => attr.Name === 'email');
      const cognitoEmail = emailAttribute?.Value || email;

      // Get user from database
      let user = await this.userService.findByCognitoSub(cognitoSub);
      if (!user) {
        // Create user with Cognito data
        user = await this.userService.create({
          email: cognitoEmail,
          cognitoSub,
        });
      }

      // Generate our own JWT token
      const jwtToken = this.generateAccessToken(cognitoSub, user.email);

      // Generate new refresh token
      const refreshToken = this.generateRefreshToken(cognitoSub, user.email);

      return {
        accessToken: jwtToken,
        refreshToken,
        user,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  private generateAccessToken(cognitoSub: string, email: string): string {
    return this.jwtService.sign(
      {
        sub: cognitoSub,
        email,
        type: 'access',
      },
      {
        expiresIn: '15m', // Short-lived access token
      },
    );
  }

  private generateRefreshToken(cognitoSub: string, email: string): string {
    return this.jwtService.sign(
      {
        sub: cognitoSub,
        email,
        type: 'refresh',
      },
      {
        expiresIn: '7d', // Long-lived refresh token
      },
    );
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userService.findByCognitoSub(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newAccessToken = this.generateAccessToken(payload.sub, payload.email);
      const newRefreshToken = this.generateRefreshToken(payload.sub, payload.email);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateUser(cognitoSub: string): Promise<User | null> {
    return this.userService.findByCognitoSub(cognitoSub);
  }
}
