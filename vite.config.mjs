import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// A build from a source archive has no git history, and shouldn't fail for it.
const readGitSha = () => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
};

// Deployed to GitHub Pages at https://jamesalmeida.github.io/tesla-infotainment/
export default defineConfig({
  base: '/tesla-infotainment/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __GIT_SHA__: JSON.stringify(readGitSha()),
  },
  css: {
    modules: {
      // Keep the original class name at the front so built names stay readable,
      // e.g. `.gearSelectIcon` becomes `.gearSelectIcon_a1B2c`.
      generateScopedName: '[local]_[hash:base64:5]',
    },
  },
  build: {
    // three.js core alone is ~740 kB minified and cannot be split further.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // three.js changes far less often than the app, so keep it in its own
          // long-cached chunk. It loads lazily with the 3D car.
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: {
      include: /.+/,
      // Tests select elements by their original class names.
      modules: { classNameStrategy: 'non-scoped' },
    },
  },
});
