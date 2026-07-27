import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminRole } from '../../common/enums/admin-role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: { sub: string; email: string; role?: string }) {
    // Tokens issued before roles shipped carry no role — treat them as the
    // unrestricted access they were granted at sign-in rather than locking
    // people out mid-session.
    return { id: payload.sub, email: payload.email, role: payload.role ?? AdminRole.SUPER_ADMIN };
  }
}
