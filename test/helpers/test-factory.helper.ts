import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { env } from '../../src/common/configs/env.config.js';
import { db } from '../../src/common/database/db.js';
import type { JwtExpiresIn } from '../../src/common/types/jwt.type.js';
import type { JwtPayload } from '../../src/modules/auth/interfaces/jwt-payload.interface.js';
import type { UserRecord } from '../../src/modules/users/users.service.js';
import { RedisService } from '../../src/redis/redis.service.js';

export interface FakeUserOverrides {
  email?: string;
  username?: string;
  password?: string;
  bio?: string | null;
  image?: string | null;
  isActive?: boolean;
}

export interface FakeUserResult {
  user: UserRecord;
  plainPassword: string;
}

const DEFAULT_FAKE_PASSWORD = 'Password1234!';
let cachedDefaultPasswordHash: string | undefined;

async function getPasswordHash(password?: string): Promise<string> {
  if (!password || password === DEFAULT_FAKE_PASSWORD) {
    cachedDefaultPasswordHash ??= await bcrypt.hash(DEFAULT_FAKE_PASSWORD, 4);
    return cachedDefaultPasswordHash;
  }
  return bcrypt.hash(password, 4);
}

export async function createFakeUser(
  overrides: FakeUserOverrides = {},
): Promise<FakeUserResult> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const email = (overrides.email ?? `user_${suffix}@example.com`).toLowerCase();
  const username = overrides.username ?? `user_${suffix}`;
  const plainPassword = overrides.password ?? DEFAULT_FAKE_PASSWORD;
  const passwordHash = await getPasswordHash(overrides.password);

  const plan = db.sql.public.User.insert([
    {
      email,
      username,
      passwordHash,
      bio: overrides.bio === undefined ? `Bio for ${suffix}` : overrides.bio,
      image: overrides.image === undefined ? null : overrides.image,
      isActive: overrides.isActive ?? true,
    },
  ])
    .returning(
      'id',
      'email',
      'username',
      'passwordHash',
      'bio',
      'image',
      'isActive',
      'createdAt',
      'updatedAt',
    )
    .build();

  const [createdUser] = await db.query(plan);
  if (!createdUser) {
    throw new Error(
      `Failed to seed fake user in test database (email=${email}, username=${username})`,
    );
  }

  return {
    user: createdUser as UserRecord,
    plainPassword,
  };
}

export async function createFakeFollow(
  followerId: string,
  followingId: string,
): Promise<void> {
  await db.orm.public.Follow.createAndCount([{ followerId, followingId }], {
    onConflict: 'skip',
    conflictOn: ['followerId', 'followingId'],
  });
}

export async function createTestAccessToken(
  app: INestApplication,
  user: Pick<UserRecord, 'id' | 'email' | 'username'>,
  options: { expiresIn?: JwtExpiresIn } = {},
): Promise<string> {
  const jwtService = app.get(JwtService);
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    username: user.username,
  };

  return jwtService.signAsync(payload, {
    secret: env.JWT_ACCESS_SECRET,
    expiresIn: options.expiresIn ?? env.JWT_ACCESS_EXPIRES_IN,
    jwtid: crypto.randomUUID(),
  });
}

export async function blacklistTestToken(
  app: INestApplication,
  token: string,
  ttlSeconds = 3600,
): Promise<void> {
  const redisService = app.get(RedisService);
  await redisService.set(`auth:blacklist:${token}`, '1', ttlSeconds);
}
