import { execSync } from 'node:child_process';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  RedisContainer,
  type StartedRedisContainer,
} from '@testcontainers/redis';
import type { TestProject } from 'vitest/node';
import type {
  PgContainerConfig,
  RedisContainerConfig,
} from './testcontainers.d.js';

let pgContainer: StartedPostgreSqlContainer;
let redisContainer: StartedRedisContainer;

export async function setup(project: TestProject) {
  // Khởi động PostgreSQL 17 với RAM-disk (tmpfs)
  pgContainer = await new PostgreSqlContainer('postgres:17-alpine')
    .withDatabase('medium_lite_test')
    .withUsername('admin')
    .withPassword('admin123')
    .withTmpFs({ '/var/lib/postgresql/data': 'rw' })
    .start();

  // Khởi động Redis Container
  redisContainer = await new RedisContainer('redis:7-alpine').start();

  const connectionUri = `${pgContainer.getConnectionUri()}?schema=public`;

  const pgConfig: PgContainerConfig = {
    host: pgContainer.getHost(),
    port: pgContainer.getPort(),
    database: pgContainer.getDatabase(),
    username: pgContainer.getUsername(),
    password: pgContainer.getPassword(),
    connectionUri,
  };

  const redisConfig: RedisContainerConfig = {
    host: redisContainer.getHost(),
    port: redisContainer.getPort(),
    connectionUri: redisContainer.getConnectionUrl(),
  };

  // Cung cấp metadata kết nối qua API provide của Vitest
  project.provide('pgConfig', pgConfig);
  project.provide('redisConfig', redisConfig);

  // Áp dụng Prisma 8 migration vào container PostgreSQL vừa khởi tạo
  try {
    execSync(`pnpm prisma db migrate --db "${connectionUri}"`, {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: connectionUri },
    });
  } catch {
    execSync(`pnpm prisma db init --db "${connectionUri}"`, {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: connectionUri },
    });
  }

  // Trả về teardown hook để Vitest tự động dọn dẹp container khi kết thúc test
  return async () => {
    await Promise.all([pgContainer?.stop(), redisContainer?.stop()]);
  };
}
