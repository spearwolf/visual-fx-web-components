import {expect, test} from '@playwright/test';

test.describe('shadow-entity-legacy', () => {
  test.beforeEach('goto page', async ({page}) => {
    await page.goto('/pages/shadow-entities-legacy.html');
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
});
