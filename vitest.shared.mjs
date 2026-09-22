import {playwright} from '@vitest/browser-playwright';

/**
 * Vitest browser mode in headless chromium, shared by all packages whose output only works in a real browser
 * (custom elements, OffscreenCanvas, module workers).
 *
 * @type {import('vitest/node').TestUserConfig}
 */
export const browserTestConfig = {
  include: ['test/**/*.test.js'],
  browser: {
    enabled: true,
    provider: playwright(),
    headless: true,
    screenshotFailures: false,
    instances: [{browser: 'chromium', viewport: {width: 800, height: 600}}],
  },
};
