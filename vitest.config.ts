import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/utils.ts', 'server.ts'],
      exclude: ['tests/**', 'frontend/**'],
      thresholds: {
        lines: 35,
        functions: 35,
        branches: 25,
        statements: 35,
      },
    },
  },
});
