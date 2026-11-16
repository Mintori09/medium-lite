import { inject } from 'vitest';

const pgConfig = inject('pgConfig');
const redisConfig = inject('redisConfig');

if (pgConfig) {
  process.env.DATABASE_URL = pgConfig.connectionUri;
  process.env.DB_HOST = pgConfig.host;
  process.env.POSTGRES_PORT = String(pgConfig.port);
  process.env.POSTGRES_USER = pgConfig.username;
  process.env.POSTGRES_PASSWORD = pgConfig.password;
  process.env.POSTGRES_DB = pgConfig.database;
}

if (redisConfig) {
  process.env.REDIS_HOST = redisConfig.host;
  process.env.REDIS_PORT = String(redisConfig.port);
  process.env.REDIS_DATABASE = '0';
  process.env.REDIS_KEY_PREFIX = 'nest-auth-test';
}
