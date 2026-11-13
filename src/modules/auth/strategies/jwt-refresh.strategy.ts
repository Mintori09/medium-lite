import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { I18nContext, I18nService } from 'nestjs-i18n';
import type { Request } from 'express';
import { env } from '../../../common/configs/env.config.js';
import type { I18nTranslations } from '../../../generated/i18n.generated.js';
import type {
  JwtPayload,
  ActiveUserData,
} from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly i18n: I18nService<I18nTranslations>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.refreshToken ?? null,
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: env.JWT_REFRESH_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<ActiveUserData> {
    const refreshToken = req?.cookies?.refreshToken || req?.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException(
        this.i18n.translate('auth.REFRESH_TOKEN_MISSING', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      accessToken: '',
      refreshToken,
      exp: payload.exp,
    };
  }
}
