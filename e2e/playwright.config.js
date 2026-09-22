import {defineConfig, devices} from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4180);

// Playwright's webkit needs system libraries that not every Linux distribution provides (ICU 74 and flite,
// missing on Arch-based systems), so locally it only runs on request with E2E_WEBKIT=1; CI always runs it
const skipWebkit = !process.env.E2E_WEBKIT && !process.env.CI;
// every worker process loads this config again and has TEST_WORKER_INDEX set, so only the main process reports the skip
if (skipWebkit && !process.env.TEST_WORKER_INDEX) console.warn('e2e: skipping the webkit project (set E2E_WEBKIT=1 to run it)');

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', {open: 'never'}]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
    // npm-packages.spec.js and server.spec.js need no browser, running them once is enough
    {name: 'firefox', use: {...devices['Desktop Firefox']}, testIgnore: ['npm-packages.spec.js', 'server.spec.js']},
    ...(skipWebkit
      ? []
      : [{name: 'webkit', use: {...devices['Desktop Safari']}, testIgnore: ['npm-packages.spec.js', 'server.spec.js']}]),
  ],
  webServer: {
    command: 'node server.mjs',
    url: `http://localhost:${PORT}/pages/bundle.html`,
    reuseExistingServer: !process.env.CI,
    env: {E2E_PORT: String(PORT)},
  },
});
