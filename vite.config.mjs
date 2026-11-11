import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

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

// GitHub Pages serves the app under /tesla-infotainment/. Vercel previews are served at the
// root, so the same branch can be tested without rewriting every asset URL.
const base = process.env.VERCEL ? '/' : '/tesla-infotainment/';

export default defineConfig({
  base,
  // The car model is a binary asset. Tests read its node tree through `?inline`.
  assetsInclude: ['**/*.glb'],
  plugins: [
    react(),
    VitePWA({
      // The update prompt is the app's own, so the plugin only generates the worker.
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Tesla Infotainment Simulator',
        short_name: 'Tesla UI',
        description: 'An unofficial fan-made simulator of a Tesla infotainment screen.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'any',
        scope: './',
        start_url: './',
        icons: [
          { src: 'logo192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,glb,hdr,mp3}'],
        // The compressed 3D model is just over 4 MB, and the cache has to hold it.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
      },
      devOptions: { enabled: false },
    }),
  ],
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
