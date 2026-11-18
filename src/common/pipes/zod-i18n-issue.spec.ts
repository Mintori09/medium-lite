import { describe, expect, it, vi } from 'vitest';
import type { core } from 'zod';
import { translateZodIssue, translateZodIssues } from './zod-i18n-issue.js';

const t = vi.fn((key: string, args?: Record<string, unknown>) =>
  args ? `${key}|${JSON.stringify(args)}` : key,
);

describe('translateZodIssue', () => {
  it('should translate missing field issue to REQUIRED', () => {
    const issue: core.$ZodIssue = {
      code: 'invalid_type',
      expected: 'string',
      path: ['email'],
      message: 'Invalid input: expected string, received undefined',
    };

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.REQUIRED|{"field":"email"}',
    );
  });

  it('should translate invalid_type with non-undefined value to INVALID_TYPE', () => {
    const issue: core.$ZodIssue = {
      code: 'invalid_type',
      expected: 'string',
      path: ['email'],
      message: 'Invalid input: expected string, received number',
    };

    expect(translateZodIssue(issue, { email: 123 }, t)).toBe(
      'validation.INVALID_TYPE|{"field":"email"}',
    );
  });

  it('should translate invalid email format issue to INVALID_EMAIL', () => {
    const issue: core.$ZodIssue = {
      code: 'invalid_format',
      format: 'email',
      path: ['email'],
      message: 'Invalid email address',
    };

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.INVALID_EMAIL|{"field":"email"}',
    );
  });

  it('should translate invalid url format issue to INVALID_URL', () => {
    const issue: core.$ZodIssue = {
      code: 'invalid_format',
      format: 'url',
      path: ['website'],
      message: 'Invalid URL',
    };

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.INVALID_URL|{"field":"website"}',
    );
  });

  it('should translate generic invalid format to INVALID_FORMAT', () => {
    const issue: core.$ZodIssue = {
      code: 'invalid_format',
      format: 'regex',
      path: ['code'],
      message: 'Invalid format',
    };

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.INVALID_FORMAT|{"field":"code"}',
    );
  });

  it('should translate unknown code to default INVALID', () => {
    const issue = {
      code: 'custom_unknown_code',
      path: ['field1'],
      message: 'Unknown error',
    } as unknown as core.$ZodIssue;

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.INVALID|{"field":"field1"}',
    );
  });

  it('should translate too_small issue with minimum parameter', () => {
    const issue: core.$ZodIssue = {
      code: 'too_small',
      origin: 'string',
      minimum: 3,
      inclusive: true,
      path: ['username'],
      message: 'Too small',
    };

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.TOO_SHORT|{"field":"username","minimum":3}',
    );
  });

  it('should translate too_big issue with maximum parameter', () => {
    const issue: core.$ZodIssue = {
      code: 'too_big',
      origin: 'string',
      maximum: 30,
      inclusive: true,
      path: ['username'],
      message: 'Too big',
    };

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.TOO_LONG|{"field":"username","maximum":30}',
    );
  });

  it('should translate unrecognized_keys issue with joined keys', () => {
    const issue = {
      code: 'unrecognized_keys',
      keys: ['foo', 'bar'],
      path: [],
      message: 'Unrecognized keys: "foo", "bar"',
    } as unknown as core.$ZodIssue;

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.UNRECOGNIZED_KEYS|{"keys":"foo, bar"}',
    );
  });

  it('should translate invalid_value issue', () => {
    const issue = {
      code: 'invalid_value',
      path: ['role'],
      message: 'Invalid value',
    } as unknown as core.$ZodIssue;

    expect(translateZodIssue(issue, {}, t)).toBe(
      'validation.INVALID_VALUE|{"field":"role"}',
    );
  });

  it('should translate multiple issues concurrently', () => {
    const issues: core.$ZodIssue[] = [
      { code: 'invalid_format', format: 'email', path: ['email'], message: '' },
      {
        code: 'too_small',
        origin: 'string',
        minimum: 6,
        inclusive: true,
        path: ['password'],
        message: '',
      },
    ];

    expect(translateZodIssues(issues, {}, t)).toHaveLength(2);
  });
});
