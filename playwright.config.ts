import { defineConfig, devices } from '@playwright/test';

// Unusual on purpose: other projects' preview servers must not be mistaken for this one.
const PORT = Number(process.env.E2E_PORT ?? 4791);
// GitHub's runners are slower than a developer machine, especially with software WebGL. One
// worker avoids two browsers competing for the same CPU and memory, and the longer timeouts
// cover the boot of the 3D car.
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  timeout: isCI ? 90_000 : 45_000,
  workers: isCI ? 1 : undefined,
  expect: { timeout: isCI ? 20_000 : 5_000 },
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
