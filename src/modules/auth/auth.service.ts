import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
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

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('aws.region'),
    });
    this.clientId = this.configService.get<string>('aws.cognito.clientId') || '';
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

      // Create user in database
      const user = await this.userService.create({
        email,
        cognitoSub,
      });

      // Generate JWT token
      const accessToken = this.generateAccessToken(cognitoSub, email);

      return {
        accessToken,
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
      const refreshToken = response.AuthenticationResult?.RefreshToken;

      // Get user info from Cognito
      const getUserCommand = new GetUserCommand({
        AccessToken: accessToken,
      });
      const cognitoUserData = await this.cognitoClient.send(getUserCommand);
      const cognitoSub = cognitoUserData.Username || '';
      
      // Extract email from Cognito attributes
      const emailAttribute = cognitoUserData.UserAttributes?.find(attr => attr.Name === 'email');
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
      },
      {
        expiresIn: `${this.configService.get<number>('jwt.expiresIn')}s`,
      },
    );
  }

  async validateUser(cognitoSub: string): Promise<User | null> {
    return this.userService.findByCognitoSub(cognitoSub);
  }
}
