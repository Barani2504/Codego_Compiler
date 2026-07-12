import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req.query?.token as string,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'changeme-secret',
    });
  }

  async validate(payload: any) {
    return {
      sub: payload.sub,
      userId: payload.sub,
      regNumber: payload.regNumber,
      name: payload.name,
      role: payload.role,
      department: payload.department,
      year: payload.year,
    };
  }
}
