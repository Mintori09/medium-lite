import { describe, expect, it } from 'vitest';
import { RegisterSchema } from './register.dto.js';

describe('RegisterSchema', () => {
  const basePayload = {
    email: 'user@example.com',
    username: 'valid_user',
  };

  it('accepts password with exactly 72 ASCII bytes', () => {
    const result = RegisterSchema.safeParse({
      ...basePayload,
      password: 'a'.repeat(72),
    });

    expect(result.success).toBe(true);
  });

  it('rejects password exceeding 72 ASCII bytes', () => {
    const result = RegisterSchema.safeParse({
      ...basePayload,
      password: 'a'.repeat(73),
    });

    expect(result.success).toBe(false);
  });

  it('rejects Vietnamese multi-byte password under 72 chars but over 72 UTF-8 bytes', () => {
    // 'ế' is 3 bytes in UTF-8: 25 * 3 = 75 bytes (> 72 bytes), length is 25 chars (< 72)
    const password = 'ế'.repeat(25);
    expect(password.length).toBe(25);
    expect(Buffer.byteLength(password, 'utf8')).toBe(75);

    const result = RegisterSchema.safeParse({
      ...basePayload,
      password,
    });

    expect(result.success).toBe(false);
  });
});
