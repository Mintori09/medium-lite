import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { I18nContext, I18nService } from 'nestjs-i18n';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import {
  PASSWORD_HASH_ROUNDS,
  getRefreshTokenKey,
} from '../../common/constants/auth.constants.js';
import { env } from '../../common/configs/env.config.js';
import { getUniqueViolationConstraint } from '../../common/utils/database-error.util.js';
import { parseDurationToSeconds } from '../../common/utils/duration.util.js';
import { hashToken } from '../../common/utils/token.util.js';
import type { I18nTranslations } from '../../generated/i18n.generated.js';
import { RedisService } from '../../redis/redis.service.js';
import { UsersService } from '../users/users.service.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type {
  ActiveUserData,
  AuthTokens,
  CurrentUserResponse,
  JwtPayload,
} from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {}

  private t(
    key: Parameters<I18nService<I18nTranslations>['translate']>[0],
  ): string {
    return this.i18n.translate(key, { lang: I18nContext.current()?.lang });
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const email = dto.email.toLowerCase();
    const existingEmail = await this.usersService.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException(this.t('auth.EMAIL_EXISTS'));
    }

    const existingUsername = await this.usersService.findByUsername(
      dto.username,
    );
    if (existingUsername) {
      throw new ConflictException(this.t('auth.USERNAME_EXISTS'));
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS);

    try {
      await this.usersService.create({
        email,
        username: dto.username,
        passwordHash,
        bio: dto.bio,
        image: dto.image,
      });
    } catch (error) {
      const constraint = getUniqueViolationConstraint(error);
      if (constraint !== null) {
        this.logger.warn(
          `Concurrent registration unique violation (${constraint || 'unknown constraint'})`,
        );
        const lowerConstraint = constraint.toLowerCase();
        if (lowerConstraint.includes('username')) {
          throw new ConflictException(this.t('auth.USERNAME_EXISTS'));
        }
        if (lowerConstraint.includes('email')) {
          throw new ConflictException(this.t('auth.EMAIL_EXISTS'));
        }
        try {
          const [conflictByUsername, conflictByEmail] = await Promise.all([
            this.usersService.findByUsername(dto.username),
            this.usersService.findByEmail(email),
          ]);
          if (conflictByUsername && !conflictByEmail) {
            throw new ConflictException(this.t('auth.USERNAME_EXISTS'));
          }
        } catch (lookupError) {
          if (lookupError instanceof ConflictException) {
            throw lookupError;
          }
          this.logger.warn(
            `Failed to disambiguate unique violation during registration: ${
              lookupError instanceof Error
                ? lookupError.message
                : String(lookupError)
            }`,
          );
        }
        throw new ConflictException(this.t('auth.EMAIL_EXISTS'));
      }
      this.logger.error(
        'Unexpected error during user registration',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }

    return { message: this.t('auth.REGISTER_SUCCESS') };
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException(this.t('auth.INVALID_CREDENTIALS'));
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException(this.t('auth.INVALID_CREDENTIALS'));
    }

    if (!user.isActive) {
      this.logger.warn(`Disabled account login attempt for userId=${user.id}`);
      throw new UnauthorizedException(this.t('auth.ACCOUNT_DISABLED'));
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.username,
    );
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(
    userId: string,
    incomingRefreshToken: string,
  ): Promise<AuthTokens> {
    const storedTokenHash = await this.redisService.get(
      this.getRefreshKey(userId),
    );
    const incomingTokenHash = hashToken(incomingRefreshToken);
    if (
      !storedTokenHash ||
      !this.tokensEqual(storedTokenHash, incomingTokenHash)
    ) {
      if (storedTokenHash) {
        this.logger.warn(
          `Refresh token mismatch for userId=${userId}; revoking stored refresh token`,
        );
        await this.redisService.del(this.getRefreshKey(userId));
      }
      throw new UnauthorizedException(this.t('auth.REFRESH_TOKEN_INVALID'));
    }

    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(this.t('auth.USER_INACTIVE'));
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.username,
    );
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(user: ActiveUserData): Promise<{ message: string }> {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const fallbackTtlSeconds = parseDurationToSeconds(
      env.JWT_ACCESS_EXPIRES_IN,
    );
    const ttlInSeconds =
      user.exp && user.exp > nowInSeconds
        ? user.exp - nowInSeconds
        : fallbackTtlSeconds;

    if (user.accessToken) {
      await this.redisService.set(
        `auth:blacklist:${hashToken(user.accessToken)}`,
        '1',
        ttlInSeconds,
      );
    }

    await this.redisService.del(this.getRefreshKey(user.userId));

    return { message: this.t('auth.LOGOUT_SUCCESS') };
  }

  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException(this.t('auth.USER_NOT_FOUND'));
    }

    const { passwordHash: _hash, ...userProfile } = user;
    return userProfile;
  }

  private async generateTokens(
    userId: string,
    email: string,
    username: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, username };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: env.JWT_ACCESS_SECRET,
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        jwtid: crypto.randomUUID(),
      }),
      this.jwtService.signAsync(payload, {
        secret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_REFRESH_EXPIRES_IN,
        jwtid: crypto.randomUUID(),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const decoded =
      typeof this.jwtService.decode === 'function'
        ? this.jwtService.decode<{ exp?: number }>(refreshToken)
        : null;
    const ttlSeconds =
      decoded?.exp && decoded.exp > nowInSeconds
        ? decoded.exp - nowInSeconds
        : parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN);

    await this.redisService.set(
      this.getRefreshKey(userId),
      hashToken(refreshToken),
      ttlSeconds,
    );
  }

  private tokensEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  }

  private getRefreshKey(userId: string): string {
    return getRefreshTokenKey(userId);
  }
}
