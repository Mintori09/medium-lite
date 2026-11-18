import type { RedisOptions } from 'ioredis';
import { env } from './env.config.js';

export const redisConfig: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME || undefined,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DATABASE,
  keyPrefix: env.REDIS_KEY_PREFIX ? `${env.REDIS_KEY_PREFIX}:` : undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};
