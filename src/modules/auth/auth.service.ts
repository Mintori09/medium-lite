import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { I18nContext, I18nService } from 'nestjs-i18n';
import bcrypt from 'bcrypt';
import {
  PASSWORD_HASH_ROUNDS,
  getRefreshTokenKey,
} from '../../common/constants/auth.constants.js';
import { env } from '../../common/configs/env.config.js';
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

    await this.usersService.create({
      email,
      username: dto.username,
      passwordHash,
      bio: dto.bio,
      image: dto.image,
    });

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
    const storedToken = await this.redisService.get(this.getRefreshKey(userId));
    if (!storedToken || storedToken !== incomingRefreshToken) {
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
    const ttlInSeconds =
      user.exp && user.exp > nowInSeconds ? user.exp - nowInSeconds : 15 * 60;

    if (user.accessToken) {
      await this.redisService.set(
        `auth:blacklist:${user.accessToken}`,
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
    const ttlSeconds = 7 * 24 * 60 * 60; // 7 ngày
    await this.redisService.set(
      this.getRefreshKey(userId),
      refreshToken,
      ttlSeconds,
    );
  }

  private getRefreshKey(userId: string): string {
    return getRefreshTokenKey(userId);
  }
}
