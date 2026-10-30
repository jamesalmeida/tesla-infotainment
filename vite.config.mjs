import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Deployed to GitHub Pages at https://jamesalmeida.github.io/tesla-infotainment/
export default defineConfig({
  base: '/tesla-infotainment/',
  plugins: [react()],
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
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: true,
  },
});
