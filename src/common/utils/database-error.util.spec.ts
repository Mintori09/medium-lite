import { describe, expect, it } from 'vitest';
import { getUniqueViolationConstraint } from './database-error.util.js';

describe('getUniqueViolationConstraint', () => {
  it('returns constraint name when sqlState is 23505 at top level', () => {
    expect(
      getUniqueViolationConstraint({
        sqlState: '23505',
        constraint: 'User_email_key',
      }),
    ).toBe('User_email_key');
  });

  it('returns constraint name when code is 23505 in nested cause', () => {
    expect(
      getUniqueViolationConstraint({
        cause: {
          code: '23505',
          constraint: 'User_username_key',
        },
      }),
    ).toBe('User_username_key');
  });

  it('returns empty string when 23505 has no constraint property', () => {
    expect(getUniqueViolationConstraint({ sqlState: '23505' })).toBe('');
  });

  it('returns null for non-unique errors or depth >= 4', () => {
    expect(getUniqueViolationConstraint({ sqlState: '23503' })).toBeNull();
    expect(
      getUniqueViolationConstraint({
        cause: {
          cause: {
            cause: {
              cause: { sqlState: '23505', constraint: 'too_deep' },
            },
          },
        },
      }),
    ).toBeNull();
    expect(getUniqueViolationConstraint(null)).toBeNull();
  });
});
