import {expect, test} from '@playwright/test';
import {colorRuns, hasDrawnSomething, hueBuckets} from '../../testing/pixels.js';
import {collectProblems, collectRequests, isRedOrBlueMix, readRow} from './helpers.js';

// the published rainbow-line package, served as it is — the element and the bundled offscreen-display
// have to work together without any build step on the consumer side

const VARIANTS = [
  {page: '/pages/bundle.html', script: '/pkg/rainbow-line/bundle.js', workerFile: undefined},
  {
    page: '/pages/separate-worker.html',
    script: '/pkg/rainbow-line/rainbow-line.js',
    workerFile: '/pkg/rainbow-line/rainbow-line.worker.js',
  },
];

for (const variant of VARIANTS) {
  test.describe(variant.script, () => {
    test('draws an animated rainbow', async ({page}) => {
      const problems = collectProblems(page);
      await page.goto(variant.page);

      const line = page.locator('#default');
      await expect.poll(async () => hasDrawnSomething(await readRow(line))).toBe(true);

      const row = await readRow(line);
      expect(hueBuckets(row).size).toBeGreaterThanOrEqual(10);
      expect(colorRuns(row)).toBe(360 / 10);

      await expect.poll(() => readRow(line)).not.toEqual(row);

      expect(problems).toEqual([]);
    });

    test('applies the attributes of the element', async ({page}) => {
      const problems = collectProblems(page);
      await page.goto(variant.page);

      const line = page.locator('#custom');
      await expect.poll(async () => hasDrawnSomething(await readRow(line))).toBe(true);

      const row = await readRow(line);
      expect(row.every(isRedOrBlueMix)).toBe(true);
      expect(colorRuns(row)).toBe(360 / 60);

      expect(problems).toEqual([]);
    });

    test(variant.workerFile ? 'loads the worker from its own file' : 'has the worker inlined', async ({page}) => {
      const requests = collectRequests(page);
      await page.goto(variant.page);
      await expect.poll(async () => hasDrawnSomething(await readRow(page.locator('#default')))).toBe(true);

      // every <rainbow-line> starts a worker of its own, so the worker file may be requested more than once
      const scripts = [...new Set(requests.filter((path) => path.endsWith('.js')))];
      expect(scripts).toEqual(variant.workerFile ? [variant.script, variant.workerFile] : [variant.script]);
    });

    test('terminates the workers of removed elements', async ({page}) => {
      await page.goto(variant.page);
      await expect.poll(() => page.workers().length).toBe(2);

      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          document.body.append(document.createElement('rainbow-line'));
        }
      });
      // the workers have to be running before the elements are removed, otherwise there would be nothing to terminate
      await expect.poll(() => page.workers().length).toBe(7);

      await page.evaluate(() => {
        for (const line of document.querySelectorAll('rainbow-line:not([id])')) {
          line.remove();
        }
      });
      await expect.poll(() => page.workers().length).toBe(2);
    });
  });
}
