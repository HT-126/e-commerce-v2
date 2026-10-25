import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Test files share one database, so they run one at a time.
    fileParallelism: false,
    globalSetup: ['./tests/global-setup.js'],
    env: { NODE_ENV: 'test' },
  },
});
