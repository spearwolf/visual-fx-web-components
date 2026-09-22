import {expect, test} from '@playwright/test';
import {colorRuns, hasDrawnSomething, hueBuckets} from '../../testing/pixels.js';
import {collectProblems, isRedOrBlueMix, readRow} from './helpers.js';

// an astro site that uses <RainbowLine> from @spearwolf/astro-rainbow-line and hosts the vendored
// rainbow-line script below its base url — built with `astro build`, served statically

test.describe('astro site using <RainbowLine>', () => {
  test('loads the vendored rainbow-line script below the base url', async ({page}) => {
    const problems = collectProblems(page);
    const scriptResponse = page.waitForResponse((res) => /\/astro\/js\/rainbow-line-v[\d.]+\.js$/.test(res.url()));

    await page.goto('/astro/');

    expect((await scriptResponse).status()).toBe(200);
    await expect(page.locator('rainbow-line')).toHaveCount(4);
    expect(problems).toEqual([]);
  });

  test('renders a rainbow with the default props', async ({page}) => {
    await page.goto('/astro/');

    const line = page.locator('#default rainbow-line');
    await expect(line).toHaveCSS('height', '20px');
    await expect.poll(async () => hasDrawnSomething(await readRow(line))).toBe(true);

    const row = await readRow(line);
    expect(hueBuckets(row).size).toBeGreaterThanOrEqual(10);
    expect(colorRuns(row)).toBe(360 / 10);
  });

  test('passes its props through to the element', async ({page}) => {
    await page.goto('/astro/');

    const line = page.locator('#custom rainbow-line');
    await expect.poll(async () => hasDrawnSomething(await readRow(line))).toBe(true);

    const row = await readRow(line);
    expect(row.every(isRedOrBlueMix)).toBe(true);
    expect(colorRuns(row)).toBe(360 / 60);
  });

  test('renders the shadow as a blurred second line', async ({page}) => {
    await page.goto('/astro/');

    const shadow = page.locator('#shadow rainbow-line.rainbow-shadow');
    await expect(shadow).toHaveCSS('filter', 'blur(12px)');
    await expect(shadow).toHaveCSS('opacity', '0.4');
    await expect(shadow).toHaveCSS('height', '12px');
  });
});
