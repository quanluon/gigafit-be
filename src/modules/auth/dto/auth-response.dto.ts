import { User } from 'src/repositories';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken?: string;
  user!: User;
}
