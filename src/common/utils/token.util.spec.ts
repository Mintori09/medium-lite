import { describe, expect, it } from 'vitest';
import { hashToken } from './token.util.js';

describe('hashToken', () => {
  it('returns a deterministic 64-character SHA-256 hex digest', () => {
    const hash1 = hashToken('sample-jwt-token');
    const hash2 = hashToken('sample-jwt-token');

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different digests for different tokens', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });
});
