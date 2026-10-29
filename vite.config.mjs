import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Deployed to GitHub Pages at https://jamesalmeida.github.io/tesla-infotainment/
export default defineConfig({
  base: '/tesla-infotainment/',
  plugins: [react()],
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    css: true,
  },
});
