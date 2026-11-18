import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';
import type { UsersService } from '../../users/users.service.js';
import type { RedisService } from '../../../redis/redis.service.js';
import type { Request } from 'express';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockUsersService: Partial<UsersService>;
  let mockRedisService: Partial<RedisService>;

  beforeEach(() => {
    mockUsersService = {
      findById: vi.fn(),
    };
    mockRedisService = {
      get: vi.fn(),
    };
    const mockI18nService = {
      translate: vi.fn((key: string) => key),
    };
    strategy = new JwtStrategy(
      mockUsersService as UsersService,
      mockRedisService as RedisService,
      mockI18nService as never,
    );
  });

  it('should throw UnauthorizedException if token is blacklisted in Redis', async () => {
    const mockReq = {
      headers: {
        authorization: 'Bearer blacklisted-token',
      },
    } as unknown as Request;

    vi.mocked(mockRedisService.get!).mockResolvedValue('1');

    await expect(
      strategy.validate(mockReq, {
        sub: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(mockRedisService.get).toHaveBeenCalledWith(
      'auth:blacklist:blacklisted-token',
    );
  });

  it('should validate and return ActiveUserData if token is valid and user is active', async () => {
    const mockReq = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as unknown as Request;

    vi.mocked(mockRedisService.get!).mockResolvedValue(null);
    vi.mocked(mockUsersService.findById!).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      bio: null,
      image: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await strategy.validate(mockReq, {
      sub: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      exp: 1234567890,
    });

    expect(result).toEqual({
      userId: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      accessToken: 'valid-token',
      exp: 1234567890,
    });
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    const mockReq = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as unknown as Request;

    vi.mocked(mockRedisService.get!).mockResolvedValue(null);
    vi.mocked(mockUsersService.findById!).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      bio: null,
      image: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      strategy.validate(mockReq, {
        sub: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if bearer token is missing', async () => {
    const mockReq = {
      headers: {},
    } as unknown as Request;

    await expect(
      strategy.validate(mockReq, {
        sub: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user is not found', async () => {
    const mockReq = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as unknown as Request;

    vi.mocked(mockRedisService.get!).mockResolvedValue(null);
    vi.mocked(mockUsersService.findById!).mockResolvedValue(null);

    await expect(
      strategy.validate(mockReq, {
        sub: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
