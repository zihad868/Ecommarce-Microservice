import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tools/integration/**/*.test.mjs',
      'services/**/__tests__/integration/**/*.int.test.ts',
    ],
    globalSetup: ['./tools/integration/setup.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
