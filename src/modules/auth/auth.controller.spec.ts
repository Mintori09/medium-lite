import { describe, expect, it } from 'vitest';
import { DECORATORS } from '@nestjs/swagger';
import { AuthController } from './auth.controller.js';

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
});
