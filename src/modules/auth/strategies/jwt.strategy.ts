import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UserService } from '../../user/user.service';

interface JwtPayload {
  sub: string;
  email: string;
}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }
  async validate(payload: JwtPayload): Promise<{ userId: string; email: string }> {
    const user = await this.userService.findByCognitoSub(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { userId: user._id!.toString(), email: payload.email };
  }
}
