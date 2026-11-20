import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { IS_OPTIONAL_AUTH_KEY } from '../decorators/optional-auth.decorator.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  const createContext = (authHeader?: string): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: authHeader !== undefined ? { authorization: authHeader } : {},
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('canActivate returns true for public routes', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => key === IS_PUBLIC_KEY);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('canActivate returns true for optional-auth routes without authorization header', () => {
    reflector.getAllAndOverride.mockImplementation(
      (key: string) => key === IS_OPTIONAL_AUTH_KEY,
    );
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('canActivate delegates to super.canActivate for optional-auth routes with authorization header', () => {
    reflector.getAllAndOverride.mockImplementation(
      (key: string) => key === IS_OPTIONAL_AUTH_KEY,
    );
    const superCanActivate = vi
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
    const ctx = createContext('Bearer token');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(ctx);
    superCanActivate.mockRestore();
  });

  it('canActivate delegates to super.canActivate for protected routes', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const superCanActivate = vi
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
    const ctx = createContext('Bearer token');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(superCanActivate).toHaveBeenCalledWith(ctx);
    superCanActivate.mockRestore();
  });

  it('handleRequest returns user when valid', () => {
    const user = { id: 'u1', email: 'a@b.com', username: 'alice' };
    expect(guard.handleRequest(null, user, null, createContext())).toEqual(user);
  });

  it('handleRequest rethrows err when err is provided', () => {
    const err = new Error('TokenExpiredError');
    expect(() =>
      guard.handleRequest(err, null, null, createContext()),
    ).toThrow(err);
  });

  it('handleRequest throws UnauthorizedException when user is missing', () => {
    expect(() =>
      guard.handleRequest(null, null, null, createContext()),
    ).toThrow(UnauthorizedException);
  });
});
