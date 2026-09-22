import {defineConfig, devices} from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4180);

// Playwright's webkit needs system libraries that not every Linux distribution provides (ICU 74 and flite,
// missing on Arch-based systems); E2E_SKIP_WEBKIT=1 leaves it out locally, CI always runs it
const skipWebkit = !!process.env.E2E_SKIP_WEBKIT && !process.env.CI;
// every worker process loads this config again and has TEST_WORKER_INDEX set, so only the main process reports the skip
if (skipWebkit && !process.env.TEST_WORKER_INDEX) console.warn('e2e: skipping the webkit project (E2E_SKIP_WEBKIT is set)');

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
    // npm-packages.spec.js only reads files and needs no browser, running it once is enough
    {name: 'firefox', use: {...devices['Desktop Firefox']}, testIgnore: 'npm-packages.spec.js'},
    ...(skipWebkit ? [] : [{name: 'webkit', use: {...devices['Desktop Safari']}, testIgnore: 'npm-packages.spec.js'}]),
  ],
  webServer: {
    command: 'node server.mjs',
    url: `http://localhost:${PORT}/pages/bundle.html`,
    reuseExistingServer: !process.env.CI,
    env: {E2E_PORT: String(PORT)},
  },
});
