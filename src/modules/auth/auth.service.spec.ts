import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { UsersService } from '../users/users.service.js';
import type { JwtService } from '@nestjs/jwt';
import type { RedisService } from '../../redis/redis.service.js';
import type { Models } from '../../common/database/contract.d.js';
import bcrypt from 'bcrypt';
import { getI18n } from '../../../test/helpers/i18n-test.helper.js';

const createMockUser = (
  overrides?: Partial<Models.public_User>,
): Models.public_User => ({
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
  bio: null,
  image: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: Partial<UsersService>;
  let mockJwtService: Partial<JwtService>;
  let mockRedisService: Partial<RedisService>;

  beforeEach(() => {
    mockUsersService = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      create: vi.fn(),
    };

    mockJwtService = {
      signAsync: vi.fn().mockImplementation((_payload, options) => {
        return Promise.resolve(
          options?.secret?.includes('refresh')
            ? 'mock-refresh-token'
            : 'mock-access-token',
        );
      }),
    };

    mockRedisService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    const mockI18nService = {
      translate: vi.fn((key: string) => {
        try {
          return getI18n('en', key as any);
        } catch {
          return key;
        }
      }),
    };

    authService = new AuthService(
      mockUsersService as UsersService,
      mockJwtService as JwtService,
      mockRedisService as RedisService,
      mockI18nService as never,
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue(null);
      vi.mocked(mockUsersService.findByUsername!).mockResolvedValue(null);
      vi.mocked(mockUsersService.create!).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed',
        bio: null,
        image: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      });

      expect(result).toEqual({
        message: getI18n('en', 'auth.REGISTER_SUCCESS'),
      });
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue(
        createMockUser(),
      );

      await expect(
        authService.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username exists', async () => {
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue(null);
      vi.mocked(mockUsersService.findByUsername!).mockResolvedValue(
        createMockUser(),
      );

      await expect(
        authService.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash,
        bio: null,
        image: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const tokens = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(tokens).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'auth:refresh_token:user-1',
        'mock-refresh-token',
        604800,
      );
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 10);
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash,
        bio: null,
        image: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is disabled', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash,
        bio: null,
        image: null,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      vi.mocked(mockUsersService.findByEmail!).mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should throw UnauthorizedException if stored refresh token is missing in Redis', async () => {
      vi.mocked(mockRedisService.get!).mockResolvedValue(null);

      await expect(
        authService.refreshTokens('user-1', 'incoming-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if stored refresh token does not match incoming token', async () => {
      vi.mocked(mockRedisService.get!).mockResolvedValue('different-token');

      await expect(
        authService.refreshTokens('user-1', 'incoming-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      vi.mocked(mockRedisService.get!).mockResolvedValue('valid-token');
      vi.mocked(mockUsersService.findById!).mockResolvedValue(null);

      await expect(
        authService.refreshTokens('user-1', 'valid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      vi.mocked(mockRedisService.get!).mockResolvedValue('valid-token');
      vi.mocked(mockUsersService.findById!).mockResolvedValue(
        createMockUser({ isActive: false }),
      );

      await expect(
        authService.refreshTokens('user-1', 'valid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should generate new tokens, save refresh token to Redis and return tokens when valid', async () => {
      vi.mocked(mockRedisService.get!).mockResolvedValue('valid-token');
      vi.mocked(mockUsersService.findById!).mockResolvedValue(
        createMockUser({ id: 'user-1', isActive: true }),
      );

      const tokens = await authService.refreshTokens('user-1', 'valid-token');

      expect(tokens).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'auth:refresh_token:user-1',
        'mock-refresh-token',
        604800,
      );
    });
  });

  describe('logout', () => {
    it('should add access token to Redis blacklist with TTL and delete refresh token', async () => {
      const nowInSec = Math.floor(Date.now() / 1000);
      const expInSec = nowInSec + 300;

      const result = await authService.logout({
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        accessToken: 'valid-access-token',
        exp: expInSec,
      });

      expect(result).toEqual({ message: getI18n('en', 'auth.LOGOUT_SUCCESS') });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'auth:blacklist:valid-access-token',
        '1',
        expect.any(Number),
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(
        'auth:refresh_token:user-1',
      );
    });

    it('should use default 15m TTL when exp is missing or expired, and skip blacklist if accessToken is empty', async () => {
      const result = await authService.logout({
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      } as any);

      expect(result).toEqual({ message: getI18n('en', 'auth.LOGOUT_SUCCESS') });
      expect(mockRedisService.set).not.toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalledWith(
        'auth:refresh_token:user-1',
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should return user without passwordHash', async () => {
      vi.mocked(mockUsersService.findById!).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'secret-hash',
        bio: 'Hello world',
        image: 'https://avatar.com/img.png',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const user = await authService.getCurrentUser('user-1');
      expect(user).not.toHaveProperty('passwordHash');
      expect(user.id).toBe('user-1');
      expect(user.email).toBe('test@example.com');
      expect(user.bio).toBe('Hello world');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      vi.mocked(mockUsersService.findById!).mockResolvedValue(null);

      await expect(authService.getCurrentUser('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
