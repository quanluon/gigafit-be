import { User } from '@/repositories';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken?: string;
  user!: User;
}
