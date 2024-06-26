import {expect, test} from '@playwright/test';
import {lookupTests} from './lookupTests.js';

test.describe('shadow-entity', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/shadow-entities.html');
    await page.evaluate(() => customElements.whenDefined('shadow-entity'));
  });

  test('has element', async ({page}) => {
    await expect(page.getByTestId('seBase0')).toBeAttached();
  });

  test('custom element is defined', async ({page}) => {
    expect(
      await page.evaluate(() =>
        customElements
          .whenDefined('shadow-entity')
          .then(() => true)
          .catch(() => false),
      ),
    ).toBe(true);
  });

  lookupTests(['custom-element-shadow-env-exists', 'custom-element-shadow-entity-exists', 'shadow-env-ready']);
});
