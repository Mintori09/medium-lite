import { describe, it, expect } from 'vitest';
import { getUniqueViolationConstraint } from './database-error.util.js';

describe('getUniqueViolationConstraint', () => {
  it('should return constraint name when sqlState is 23505 at top level', () => {
    expect(
      getUniqueViolationConstraint({
        sqlState: '23505',
        constraint: 'User_email_key',
      }),
    ).toBe('User_email_key');
  });

  it('should return empty string when sqlState is 23505 without constraint', () => {
    expect(getUniqueViolationConstraint({ sqlState: '23505' })).toBe('');
  });

  it('should unwrap nested cause up to depth 3', () => {
    const err = {
      cause: {
        cause: {
          sqlState: '23505',
          constraint: 'User_username_key',
        },
      },
    };
    expect(getUniqueViolationConstraint(err)).toBe('User_username_key');
  });

  it('should return null for non-23505 or non-object errors', () => {
    expect(getUniqueViolationConstraint(null)).toBeNull();
    expect(getUniqueViolationConstraint('string error')).toBeNull();
    expect(getUniqueViolationConstraint({ sqlState: '23503' })).toBeNull();
  });
});
