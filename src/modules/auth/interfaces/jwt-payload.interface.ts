import type { Models } from '../../../common/database/contract.d.js';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  jti?: string;
  exp?: number;
  iat?: number;
}

export interface ActiveUserData {
  userId: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken?: string;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type CurrentUserResponse = Omit<Models.public_User, 'passwordHash'>;
