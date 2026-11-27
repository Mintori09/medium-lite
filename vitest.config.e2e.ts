import dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config({ path: '.env.test', override: true });

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    fileParallelism: false,
    globalSetup: ['./test/setup/testcontainers-global-setup.ts'],
    setupFiles: ['./test/setup/e2e-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
