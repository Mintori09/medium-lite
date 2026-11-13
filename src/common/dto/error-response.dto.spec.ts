import { describe, expect, it } from 'vitest';
import {
  ErrorResponseSchema,
  ValidationErrorResponseSchema,
} from './error-response.dto.js';

describe('ErrorResponse DTOs', () => {
  it('should validate standard error response schema with error title', () => {
    const valid = {
      statusCode: 401,
      message: 'Token has expired',
      error: 'Unauthorized',
    };
    expect(ErrorResponseSchema.parse(valid)).toEqual(valid);
  });

  it('should validate rate-limit error response without error title (ThrottlerException)', () => {
    const valid = {
      statusCode: 429,
      message: 'ThrottlerException: Too Many Requests',
    };
    expect(ErrorResponseSchema.parse(valid)).toEqual(valid);
  });

  it('should validate validation error response schema with array of messages', () => {
    const valid = {
      statusCode: 400,
      message: ['Email is invalid', 'Password must be at least 12 characters'],
      error: 'Bad Request',
    };
    expect(ValidationErrorResponseSchema.parse(valid)).toEqual(valid);
  });

  it('should reject invalid payloads', () => {
    expect(() => ErrorResponseSchema.parse({ statusCode: '400' })).toThrow();
  });
});
