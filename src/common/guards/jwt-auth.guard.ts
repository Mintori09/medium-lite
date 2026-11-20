import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { I18nContext } from 'nestjs-i18n';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(
      IS_OPTIONAL_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isOptionalAuth) {
      const request = context.switchToHttp().getRequest<Request>();
      const authHeader = request.headers.authorization;
      if (!authHeader || authHeader.trim() === '') {
        return true;
      }
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      const i18n = I18nContext.current<I18nTranslations>();
      const t = (key: Parameters<NonNullable<typeof i18n>['t']>[0]) =>
        i18n ? String(i18n.t(key)) : key;

      const infoName = (info as { name?: string })?.name;
      const infoMsg = (info as { message?: string })?.message;

      if (infoName === 'TokenExpiredError') {
        throw new UnauthorizedException(t('auth.TOKEN_EXPIRED'));
      }
      if (infoMsg === 'No auth token' || !info) {
        throw new UnauthorizedException(t('auth.TOKEN_MISSING'));
      }
      throw new UnauthorizedException(t('auth.TOKEN_REVOKED'));
    }

    return user;
  }
}
