import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger';
import type { Response } from 'express';
import { env } from '../../common/configs/env.config.js';
import { parseDurationToSeconds } from '../../common/utils/duration.util.js';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

describe('AuthController Swagger Annotations', () => {
  it('should declare correct HTTP response codes on all endpoints', () => {
    const proto = AuthController.prototype;

    const registerResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      proto.register,
    );
    expect(registerResponses).toHaveProperty('201');
    expect(registerResponses).toHaveProperty('400');
    expect(registerResponses).toHaveProperty('409');
    expect(registerResponses).toHaveProperty('429');

    const loginResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      proto.login,
    );
    expect(loginResponses).toHaveProperty('200');
    expect(loginResponses).toHaveProperty('400');
    expect(loginResponses).toHaveProperty('401');
    expect(loginResponses).toHaveProperty('429');

    const refreshResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      proto.refresh,
    );
    expect(refreshResponses).toHaveProperty('200');
    expect(refreshResponses).toHaveProperty('401');
    expect(refreshResponses).toHaveProperty('429');

    const logoutResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      proto.logout,
    );
    expect(logoutResponses).toHaveProperty('200');
    expect(logoutResponses).toHaveProperty('401');
    expect(logoutResponses).toHaveProperty('429');

    const meResponses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      proto.getCurrentUser,
    );
    expect(meResponses).toHaveProperty('200');
    expect(meResponses).toHaveProperty('401');
    expect(meResponses).toHaveProperty('404');
    expect(meResponses).toHaveProperty('429');
  });

  it('should set HttpOnly refreshToken cookie with configured maxAge and omit refreshToken from body on login and refresh', async () => {
    const mockAuthService: Partial<AuthService> = {
      login: vi.fn().mockResolvedValue({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      }),
      refreshTokens: vi.fn().mockResolvedValue({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      }),
      logout: vi.fn().mockResolvedValue({ message: 'Logout successful' }),
    };
    const controller = new AuthController(mockAuthService as AuthService);
    const mockRes = {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as Response;

    const expectedMaxAge =
      parseDurationToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000;

    const loginResult = await controller.login(
      { email: 'test@example.com', password: 'Password1234' },
      mockRes,
    );
    expect(loginResult).toEqual({ accessToken: 'access-1' });
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-1',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/auth',
        maxAge: expectedMaxAge,
      }),
    );

    const refreshResult = await controller.refresh(
      {
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        accessToken: '',
        refreshToken: 'refresh-1',
      },
      mockRes,
    );
    expect(refreshResult).toEqual({ accessToken: 'access-2' });
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refreshToken',
      'refresh-2',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/auth',
        maxAge: expectedMaxAge,
      }),
    );

    const logoutResult = await controller.logout(
      {
        userId: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        accessToken: 'access-2',
      },
      mockRes,
    );
    expect(logoutResult).toEqual({ message: 'Logout successful' });
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'strict',
        path: '/auth',
      }),
    );
  });

  it('should throw UnauthorizedException in refresh when user.refreshToken is missing', async () => {
    const controller = new AuthController({} as AuthService);
    const mockRes = { cookie: vi.fn() } as unknown as Response;

    await expect(
      controller.refresh(
        {
          userId: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          accessToken: '',
        },
        mockRes,
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
