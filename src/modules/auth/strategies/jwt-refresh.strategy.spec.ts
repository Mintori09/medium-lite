import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { JwtRefreshStrategy } from './jwt-refresh.strategy.js';
import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';
import { getI18n } from '../../../../test/helpers/i18n-test.helper.js';

describe('JwtRefreshStrategy', () => {
  let strategy: JwtRefreshStrategy;
  let mockI18nService: any;

  const mockPayload: JwtPayload = {
    sub: 'user-uuid-123',
    email: 'user@example.com',
    username: 'testuser',
    exp: 1893456000,
  };

  beforeEach(() => {
    mockI18nService = {
      translate: vi.fn((key: string) => {
        try {
          return getI18n('en', key as any);
        } catch {
          return key;
        }
      }),
    };

    strategy = new JwtRefreshStrategy(mockI18nService);
  });

  describe('validate', () => {
    it('should validate and extract refreshToken from cookies', async () => {
      const mockReq = {
        cookies: {
          refreshToken: 'valid-refresh-cookie-token',
        },
      } as unknown as Request;

      const result = await strategy.validate(mockReq, mockPayload);

      expect(result).toEqual({
        userId: mockPayload.sub,
        email: mockPayload.email,
        username: mockPayload.username,
        accessToken: '',
        refreshToken: 'valid-refresh-cookie-token',
        exp: mockPayload.exp,
      });
    });

    it('should throw UnauthorizedException if refreshToken is only in body and missing in cookies', async () => {
      const mockReq = {
        cookies: {},
        body: {
          refreshToken: 'valid-refresh-body-token',
        },
      } as unknown as Request;

      await expect(strategy.validate(mockReq, mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'auth.REFRESH_TOKEN_MISSING',
        expect.any(Object),
      );
    });

    it('should throw UnauthorizedException with i18n message if refreshToken is missing in both cookie and body', async () => {
      const mockReq = {
        cookies: {},
        body: {},
      } as unknown as Request;

      await expect(strategy.validate(mockReq, mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockI18nService.translate).toHaveBeenCalledWith(
        'auth.REFRESH_TOKEN_MISSING',
        expect.any(Object),
      );
    });
  });
});
