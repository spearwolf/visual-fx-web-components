import {expect, test} from '@playwright/test';
import {colorRuns, hasDrawnSomething} from '../../testing/pixels.js';
import {readRow} from './helpers.js';

// a screen with devicePixelRatio 2: the canvas has to have twice as many pixels as its css size, otherwise the
// browser scales it up and every edge between two color slices gets blended pixels
//
// deviceScaleFactor alone only emulates the ratio — chromium and firefox then still report the device pixel
// content box in css pixels, so both are started with a real scale factor as well (webkit measures the content
// box times devicePixelRatio, which the emulation covers). Launch options force a new worker, which is why
// these tests have a file of their own.

test.use({
  deviceScaleFactor: 2,
  launchOptions: [
    async ({browserName}, use) => {
      if (browserName === 'chromium') await use({args: ['--force-device-scale-factor=2']});
      else if (browserName === 'firefox') await use({firefoxUserPrefs: {'layout.css.devPixelsPerPx': '2'}});
      else await use({});
    },
    {scope: 'worker'},
  ],
});

for (const page of ['/pages/bundle.html', '/pages/separate-worker.html']) {
  test.describe(page, () => {
    test('draws its color slices in physical pixels', async ({page: tab}) => {
      await tab.goto(page);

      const line = tab.locator('#default');
      await expect.poll(async () => hasDrawnSomething(await readRow(line))).toBe(true);

      const row = await readRow(line);
      expect(row).toHaveLength(720);
      // 10 css pixels are 20 physical pixels
      expect(colorRuns(row)).toBe(360 / 10);
    });
  });
}
