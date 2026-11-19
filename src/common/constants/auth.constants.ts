export const PASSWORD_HASH_ROUNDS = 10;

export function getRefreshTokenKey(userId: string): string {
  return `auth:refresh_token:${userId}`;
}
