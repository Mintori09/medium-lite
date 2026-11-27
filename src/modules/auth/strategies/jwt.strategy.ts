import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { I18nContext, I18nService } from 'nestjs-i18n';
import type { Request } from 'express';
import { env } from '../../../common/configs/env.config.js';
import { hashToken } from '../../../common/utils/token.util.js';
import type { I18nTranslations } from '../../../generated/i18n.generated.js';
import { RedisService } from '../../../redis/redis.service.js';
import { UsersService } from '../../users/users.service.js';
import type {
  JwtPayload,
  ActiveUserData,
} from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<ActiveUserData> {
    const lang = I18nContext.current()?.lang;
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!rawToken) {
      throw new UnauthorizedException(
        this.i18n.translate('auth.TOKEN_MISSING', { lang }),
      );
    }

    const isBlacklisted = await this.redisService.get(
      `auth:blacklist:${hashToken(rawToken)}`,
    );
    if (isBlacklisted) {
      throw new UnauthorizedException(
        this.i18n.translate('auth.TOKEN_REVOKED', { lang }),
      );
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        this.i18n.translate('auth.USER_INACTIVE_OR_NOT_FOUND', { lang }),
      );
    }

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      accessToken: rawToken,
      exp: payload.exp,
    };
  }
}
