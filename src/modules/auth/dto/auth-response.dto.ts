import { User } from '../../../repositories';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: User;
}

export class RefreshTokenDto {
  refreshToken!: string;
}

export class RefreshResponseDto {
  accessToken!: string;
  refreshToken!: string;
}
