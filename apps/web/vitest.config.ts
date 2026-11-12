import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: [
        'src/lib/spaces/labels.ts',
        'src/lib/spaces/membership-messages.ts',
        'src/lib/spaces/resolve-active-space.ts',
        'src/lib/api/errors.ts',
        'src/lib/api/query.ts',
        'src/lib/finance/amount.ts',
        'src/lib/finance/finance-messages.ts',
        'src/lib/finance/format-money.ts',
      ],
      exclude: ['**/*.{test,spec}.{ts,tsx}'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
