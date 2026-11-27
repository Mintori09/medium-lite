import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

const mockEnv = vi.hoisted(() => ({
  NODE_ENV: 'test',
  POSTGRES_DB: 'app_test',
  DATABASE_URL: 'postgres://u:p@localhost:5432/app_test?schema=public',
  REDIS_KEY_PREFIX: 'app:test:',
  UPLOAD_DIR: './tmp/test-uploads',
}));

const mockDbExecute = vi.hoisted(() => vi.fn());

vi.mock('../../src/common/configs/env.config.js', () => ({
  env: mockEnv,
}));

vi.mock('../../src/common/database/db.js', () => ({
  db: {
    raw: {
      sql: () => ({
        affectedCount: () => ({
          build: () => ({}),
        }),
      }),
    },
    execute: mockDbExecute,
    close: vi.fn(),
  },
}));

import { assertTestEnvironment, truncateDatabase } from './db-test.helper.js';

const VALID_ENV = {
  NODE_ENV: 'test',
  POSTGRES_DB: 'app_test',
  DATABASE_URL: 'postgres://u:p@localhost:5432/app_test?schema=public',
  REDIS_KEY_PREFIX: 'app:test:',
  UPLOAD_DIR: './tmp/test-uploads',
};

describe('db-test.helper assertTestEnvironment', () => {
  beforeEach(() => {
    Object.assign(mockEnv, VALID_ENV);
    mockDbExecute.mockReset();
  });

  it('1. passes with valid test environment including query params', () => {
    expect(() => assertTestEnvironment()).not.toThrow();
  });

  it('2. throws ZodError when NODE_ENV is not test', () => {
    mockEnv.NODE_ENV = 'development';
    expect(() => assertTestEnvironment()).toThrow(ZodError);
  });

  it.each([
    ['POSTGRES_DB', 'app_prod'],
    ['REDIS_KEY_PREFIX', 'app_prod'],
    ['UPLOAD_DIR', 'app_prod'],
  ] as const)(
    '3. throws ZodError when %s does not contain test (%s)',
    (field, value) => {
      mockEnv[field] = value;
      expect(() => assertTestEnvironment()).toThrow(ZodError);
    },
  );

  it('4. throws ZodError when test only appears in user/pass/host/query', () => {
    mockEnv.DATABASE_URL =
      'postgres://test:test@test-host:5432/prod_db?schema=test';
    expect(() => assertTestEnvironment()).toThrow(ZodError);
  });

  it.each(['postgres://u:p@localhost:5432/', 'invalid-url'])(
    '5. throws ZodError for boundary or malformed DATABASE_URL: %s',
    (url) => {
      mockEnv.DATABASE_URL = url;
      expect(() => assertTestEnvironment()).toThrow(ZodError);
    },
  );

  it.each(['latest_db', 'contest'])(
    '6. rejects lexical false-positive POSTGRES_DB: %s',
    (dbName) => {
      mockEnv.POSTGRES_DB = dbName;
      mockEnv.DATABASE_URL = `postgres://u:p@localhost:5432/${dbName}`;
      expect(() => assertTestEnvironment()).toThrow(ZodError);
    },
  );

  it('7. rejects UPLOAD_DIR that traverses out of test directory', () => {
    mockEnv.UPLOAD_DIR = './tmp/test/../uploads';
    expect(() => assertTestEnvironment()).toThrow(ZodError);
  });

  it('8a. rejects when POSTGRES_DB and DATABASE_URL database name mismatch', () => {
    mockEnv.POSTGRES_DB = 'app_test';
    mockEnv.DATABASE_URL = 'postgres://u:p@localhost:5432/other_test';
    expect(() => assertTestEnvironment()).toThrow(ZodError);
  });

  it('8b. rejects when DATABASE_URL points to a remote host', () => {
    mockEnv.POSTGRES_DB = 'app_test';
    mockEnv.DATABASE_URL = 'postgres://u:p@rds.amazonaws.com:5432/app_test';
    expect(() => assertTestEnvironment()).toThrow(ZodError);
  });

  it('9. fails fast with ZodError before calling db.execute', async () => {
    mockEnv.NODE_ENV = 'production';

    await expect(truncateDatabase()).rejects.toThrow(ZodError);
    expect(mockDbExecute).not.toHaveBeenCalled();
  });
});
