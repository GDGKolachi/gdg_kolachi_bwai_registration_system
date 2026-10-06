import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: { sub: string; email: string; role?: string }) {
    // A token without a role gets none: RolesGuard refuses it and the person signs in again.
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
