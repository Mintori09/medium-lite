import { z } from 'zod';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import type { JwtExpiresIn } from '../types/jwt.type.js';

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
expand(dotenv.config({ path: envFile }));

export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // PostgreSQL
  DB_HOST: z.string().default('localhost'),
  POSTGRES_USER: z.string().default('admin'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD is required'),
  POSTGRES_DB: z.string().default('medium_lite'),
  POSTGRES_PORT: z.coerce.number().default(5432),

  // Prisma / Database
  DATABASE_URL: z.url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DATABASE: z.coerce.number().default(1),
  REDIS_KEY_PREFIX: z.string().default('nest-auth'),

  // JWT
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z
    .custom<JwtExpiresIn>(
      (val) => typeof val === 'string' || typeof val === 'number',
    )
    .default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z
    .custom<JwtExpiresIn>(
      (val) => typeof val === 'string' || typeof val === 'number',
    )
    .default('7d'),

  // Swagger
  SWAGGER_SITE_TITLE: z.string().default('The NestJs Authentication API'),
  SWAGGER_DOC_TITLE: z.string().default('NestJs Authentication'),
  SWAGGER_DOC_DESCRIPTION: z.string().default('The NestJs Authentication API'),
  SWAGGER_DOC_VERSION: z.string().default('1.0'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errorMsg = z.prettifyError(parsedEnv.error);
  console.error(
    '\x1b[31m[Error]\x1b[0m',
    ' Invalid environment variables:',
    errorMsg,
  );
  if (process.env.NODE_ENV === 'test') {
    throw new Error(
      `Invalid environment variables in test environment:\n${errorMsg}`,
    );
  }
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
