import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@lib': path.resolve(import.meta.dirname, './extension/lib'),
    },
  },
});

