/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const configuredBasePath = process.env.VITE_BASE_PATH?.trim() || '/';
const normalizedBasePath = configuredBasePath.endsWith('/') ? configuredBasePath : `${configuredBasePath}/`;
const commitBuildId =
  process.env.VITE_BUILD_ID ??
  process.env.GITHUB_SHA?.slice(0, 12) ??
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
  process.env.NETLIFY_COMMIT_REF?.slice(0, 12) ??
  'local-build';

export default defineConfig({
  base: normalizedBasePath,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_ID__: JSON.stringify(commitBuildId),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: true,
    globals: true,
    include: ['src/tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**'],
  },
});
