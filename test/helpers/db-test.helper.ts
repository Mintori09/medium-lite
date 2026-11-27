import type { INestApplication } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { env } from '../../src/common/configs/env.config.js';
import { db } from '../../src/common/database/db.js';
import { RedisService } from '../../src/redis/redis.service.js';

const containsTest = (val: string) =>
  /(?:^|[^a-z0-9])test(?:$|[^a-z0-9])/i.test(val);

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const testEnvSchema = z
  .object({
    NODE_ENV: z.literal('test'),
    POSTGRES_DB: z.string().refine(containsTest, {
      message: 'POSTGRES_DB does not look like a test database.',
    }),
    DATABASE_URL: z.string().refine(
      (val) => {
        try {
          return containsTest(new URL(val).pathname.replace(/^\/+/, ''));
        } catch {
          return false;
        }
      },
      { message: 'DATABASE_URL target does not look like a test database.' },
    ),
    REDIS_KEY_PREFIX: z.string().refine(containsTest, {
      message: 'REDIS_KEY_PREFIX does not look like a test prefix.',
    }),
    UPLOAD_DIR: z.string().refine((val) => containsTest(path.resolve(val)), {
      message: 'UPLOAD_DIR does not look like a test directory.',
    }),
  })
  .superRefine((data, ctx) => {
    let url: URL;
    try {
      url = new URL(data.DATABASE_URL);
    } catch {
      return;
    }

    if (!LOCAL_HOSTS.has(url.hostname.toLowerCase())) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must point to a local host in test mode.',
      });
    }

    const dbName = url.pathname.replace(/^\/+/, '');
    if (dbName !== data.POSTGRES_DB) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL database name must match POSTGRES_DB.',
      });
    }
  });

export function assertTestEnvironment(): void {
  testEnvSchema.parse(env);
}

export async function truncateDatabase(): Promise<void> {
  assertTestEnvironment();

  const plan = db.raw.sql`
    DO $$
    DECLARE
      stmt text;
    BEGIN
      SELECT 'TRUNCATE TABLE ' || string_agg(format('%I', tablename), ', ') || ' RESTART IDENTITY CASCADE'
      INTO stmt
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT IN ('_prisma_migrations', 'migrations');

      IF stmt IS NOT NULL THEN
        EXECUTE stmt;
      END IF;
    END $$;
  `
    .affectedCount()
    .build();

  await db.execute(plan);
}

export async function flushTestRedis(app: INestApplication): Promise<void> {
  assertTestEnvironment();
  const redisService = app.get(RedisService);
  await redisService.getClient().flushdb();
}

export async function cleanupTestUploads(): Promise<void> {
  assertTestEnvironment();
  await fs.rm(path.resolve(env.UPLOAD_DIR), { recursive: true, force: true });
}

export async function closeDatabase(): Promise<void> {
  await db.close();
}
