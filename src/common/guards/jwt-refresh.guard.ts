import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { I18nContext } from 'nestjs-i18n';
import type { I18nTranslations } from '../../generated/i18n.generated.js';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
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

      const infoMsg = (info as { message?: string })?.message;
      if (infoMsg === 'No auth token' || !info) {
        throw new UnauthorizedException(t('auth.REFRESH_TOKEN_MISSING'));
      }
      throw new UnauthorizedException(t('auth.REFRESH_TOKEN_INVALID'));
    }

    return user;
  }
}
