import {afterEach, describe, expect, test} from 'vitest';
import {page} from 'vitest/browser';
import {colorRuns, decodePngRow, hasDrawnSomething, hueBuckets, hueOf} from '../../../testing/pixels.js';

const WIDTH = 360;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function mountRainbowLine(attributes = {}) {
  const line = document.createElement('rainbow-line');
  for (const [name, value] of Object.entries(attributes)) {
    line.setAttribute(name, value);
  }
  line.style.width = `${WIDTH}px`;
  line.style.height = '20px';
  document.body.appendChild(line);
  return line;
}

async function readRow(element) {
  return decodePngRow(await page.screenshot({element, save: false}));
}

async function readDrawnRow(element) {
  let row;
  await expect
    .poll(async () => {
      row = await readRow(element);
      return hasDrawnSomething(row);
    })
    .toBe(true);
  return row;
}

const isRedOrBlueMix = ([r, g, b]) => g < 40 && r + b > 100;

/**
 * The behaviour every build of the `<rainbow-line>` element has to show, checked from the outside:
 * the tests only use the element's attributes and look at the pixels it puts on the screen.
 */
export function describeRainbowLine(variant) {
  describe(`<rainbow-line> (${variant})`, () => {
    afterEach(() => {
      for (const line of document.querySelectorAll('rainbow-line')) {
        line.worker?.terminate();
        line.remove();
      }
    });

    test('registers the custom element', () => {
      expect(customElements.get('rainbow-line')).toBeTypeOf('function');
    });

    test('is a full-width 3px high line by default', () => {
      const line = document.createElement('rainbow-line');
      document.body.appendChild(line);

      const {width, height} = line.getBoundingClientRect();
      expect(width).toBe(document.body.getBoundingClientRect().width);
      expect(height).toBe(3);
    });

    test('draws the whole rainbow in slices of 10px', async () => {
      const line = mountRainbowLine();
      const row = await readDrawnRow(line);

      expect(row).toHaveLength(WIDTH);
      expect(hueBuckets(row).size).toBeGreaterThanOrEqual(10);
      expect(colorRuns(row)).toBe(WIDTH / 10);
    });

    test('animates the colors', async () => {
      const line = mountRainbowLine();
      const before = await readDrawnRow(line);
      await sleep(300);
      const after = await readRow(line);

      expect(after).not.toEqual(before);
    });

    test('color-slice-width sets the width of the color slices', async () => {
      const line = mountRainbowLine({'color-slice-width': '60'});
      const row = await readDrawnRow(line);

      expect(colorRuns(row)).toBe(WIDTH / 60);
    });

    test('a color-slice-width below 1 is relative to the element width', async () => {
      const line = mountRainbowLine({'color-slice-width': '0.25'});
      const row = await readDrawnRow(line);

      expect(colorRuns(row)).toBe(4);
    });

    test('cycle-colors replaces the rainbow with a custom gradient', async () => {
      const line = mountRainbowLine({'cycle-colors': '#ff0000 #0000ff'});
      const row = await readDrawnRow(line);

      expect(row.every(isRedOrBlueMix)).toBe(true);
      expect(row.some(([r, , b]) => r > 200 && b < 60)).toBe(true);
      expect(row.some(([r, , b]) => b > 200 && r < 60)).toBe(true);
    });

    test('reacts to attribute changes after it has been connected', async () => {
      const line = mountRainbowLine();
      await readDrawnRow(line);

      line.setAttribute('cycle-colors', 'red blue');
      await expect.poll(async () => (await readRow(line)).every(isRedOrBlueMix)).toBe(true);

      line.setAttribute('color-slice-width', '90');
      await expect.poll(async () => colorRuns(await readRow(line))).toBe(WIDTH / 90);

      line.removeAttribute('cycle-colors');
      await expect.poll(async () => hueBuckets(await readRow(line)).size).toBeGreaterThanOrEqual(3);
    });

    test('cycle-direction and slice-cycle-time control the direction of the animation', async () => {
      const hueAtStart = async (attributes) => {
        const line = mountRainbowLine({'slice-cycle-time': '4', 'color-slice-width': '1', ...attributes});
        await readDrawnRow(line);
        const first = hueOf((await readRow(line))[0]);
        await sleep(250);
        const second = hueOf((await readRow(line))[0]);
        line.remove();
        // the shift of the hue at x=0, normalized to (-180, 180]
        return ((second - first + 540) % 360) - 180;
      };

      // right (the default) cycles through the hues backwards, left forwards
      expect(await hueAtStart({'cycle-direction': 'right'})).toBeLessThan(0);
      expect(await hueAtStart({'cycle-direction': 'left'})).toBeGreaterThan(0);
    });
  });
}
