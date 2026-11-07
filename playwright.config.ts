import { defineConfig, devices } from '@playwright/test';

// Unusual on purpose: other projects' preview servers must not be mistaken for this one.
const PORT = Number(process.env.E2E_PORT ?? 4791);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  use: {
    baseURL: `http://localhost:${PORT}/tesla-infotainment/`,
    // The service worker would answer chunk requests from its cache, hiding the failure
    // routes these tests set up. Offline behaviour is checked separately.
    serviceWorkers: 'block',
    launchOptions: {
      // Lets a machine with a browser already installed skip the download.
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
      // WebGL with no GPU, which CI doesn't have.
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/tesla-infotainment/`,
    reuseExistingServer: false,
  },
});
