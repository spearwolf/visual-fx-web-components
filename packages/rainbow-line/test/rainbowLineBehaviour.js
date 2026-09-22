import {afterEach, describe, expect, test} from 'vitest';
import {page} from 'vitest/browser';
import {colorRuns, decodePngRow, hasDrawnSomething, hueBuckets, hueOf} from '../../../testing/pixels.js';

const WIDTH = 360;

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

/** @returns {number[]} the indices at which a pixel differs from its left neighbour */
function colorEdges(row) {
  const edges = [];
  for (let i = 1; i < row.length; i++) {
    const [r, g, b] = row[i];
    const [pr, pg, pb] = row[i - 1];
    if (r !== pr || g !== pg || b !== pb) edges.push(i);
  }
  return edges;
}

/** @returns {number} how often the sign of red minus blue changes along the row; pixels with equal red and blue are skipped */
function redBlueCrossings(row) {
  let crossings = 0;
  let prevSign = 0;
  for (const [r, , b] of row) {
    const sign = Math.sign(r - b);
    if (sign === 0) continue;
    if (prevSign !== 0 && sign !== prevSign) crossings++;
    prevSign = sign;
  }
  return crossings;
}

async function expectRedAndBlueOnly(line) {
  const row = await readDrawnRow(line);

  expect(row.every(isRedOrBlueMix)).toBe(true);
  expect(row.some(([r, , b]) => r > 200 && b < 60)).toBe(true);
  expect(row.some(([r, , b]) => b > 200 && r < 60)).toBe(true);
}

/**
 * The behaviour every build of the `<rainbow-line>` element has to show, checked from the outside:
 * the tests only use the element's attributes and look at the pixels it puts on the screen.
 */
export function describeRainbowLine(variant) {
  describe(`<rainbow-line> (${variant})`, () => {
    afterEach(() => {
      for (const line of document.querySelectorAll('rainbow-line')) {
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

      await expect.poll(() => readRow(line)).not.toEqual(before);
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
        // the shift of the hue at x=0, normalized to (-180, 180]; with a cycle time of 4s the hue moves by 90° per second,
        // so a shift of more than 5° is far away from the wrap-around at 180°
        let shift = 0;
        await expect
          .poll(async () => {
            const second = hueOf((await readRow(line))[0]);
            shift = ((second - first + 540) % 360) - 180;
            return Math.abs(shift);
          })
          .toBeGreaterThan(5);
        line.remove();
        return shift;
      };

      // right (the default) cycles through the hues backwards, left forwards
      expect(await hueAtStart({'cycle-direction': 'right'})).toBeLessThan(0);
      expect(await hueAtStart({'cycle-direction': 'left'})).toBeGreaterThan(0);
    });

    test.each(['0', '-10'])('falls back to 10px slices for a color-slice-width of %s', async (value) => {
      const line = mountRainbowLine({'color-slice-width': value});
      const row = await readDrawnRow(line);

      expect(colorRuns(row)).toBe(WIDTH / 10);
      await expect.poll(() => readRow(line)).not.toEqual(row);
    });

    test('draws slices of at least one pixel for a color-slice-width that rounds to zero', async () => {
      const line = mountRainbowLine({'color-slice-width': '0.001'});
      const row = await readDrawnRow(line);

      expect(colorRuns(row)).toBeGreaterThan(WIDTH / 2);
      await expect.poll(() => readRow(line)).not.toEqual(row);
    });

    test.each(['0', '-3'])('falls back to the default cycle time for a slice-cycle-time of %s', async (value) => {
      const line = mountRainbowLine({'slice-cycle-time': value});
      const row = await readDrawnRow(line);

      expect(hueBuckets(row).size).toBeGreaterThanOrEqual(10);
      await expect.poll(() => readRow(line)).not.toEqual(row);
    });

    test.each(['0', '-2'])('falls back to one repetition for a cycle-colors-repeat of %s', async (value) => {
      const line = mountRainbowLine({'cycle-colors': '#ff0000 #0000ff', 'cycle-colors-repeat': value});

      await expectRedAndBlueOnly(line);
    });

    test.each(['red, blue', 'red,blue', '#ff0000\t#0000ff', '#ff0000\n  #0000ff'])(
      'accepts cycle-colors separated by commas, tabs and line breaks',
      async (value) => {
        const line = mountRainbowLine({'cycle-colors': value});

        await expectRedAndBlueOnly(line);
      },
    );

    test('keeps css color functions in cycle-colors together', async () => {
      const line = mountRainbowLine({'cycle-colors': 'rgb(255, 0, 0) rgb(0 0 255)'});

      await expectRedAndBlueOnly(line);
    });

    test('leaves out invalid colors of cycle-colors', async () => {
      const line = mountRainbowLine({'cycle-colors': '#ff0000 notacolor #0000ff'});

      await expectRedAndBlueOnly(line);
    });

    test('shows the rainbow when cycle-colors has no valid color', async () => {
      const line = mountRainbowLine({'cycle-colors': 'notacolor alsonotacolor'});
      const row = await readDrawnRow(line);

      expect(hueBuckets(row).size).toBeGreaterThanOrEqual(10);
    });

    test('applies a cycle-colors-repeat that changes after the element has been connected', async () => {
      const line = mountRainbowLine({'cycle-colors': '#ff0000 #0000ff', 'color-slice-width': '1'});
      await readDrawnRow(line);

      await expect.poll(async () => redBlueCrossings(await readRow(line))).toBeLessThanOrEqual(2);

      line.setAttribute('cycle-colors-repeat', '3');
      await expect.poll(async () => redBlueCrossings(await readRow(line))).toBeGreaterThanOrEqual(5);
    });

    test('sets a numeric attribute back to its default when it is removed or out of range', async () => {
      const line = mountRainbowLine({'color-slice-width': '60'});
      const row = await readDrawnRow(line);

      expect(colorRuns(row)).toBe(6);

      line.removeAttribute('color-slice-width');
      await expect.poll(async () => colorRuns(await readRow(line))).toBe(36);

      line.setAttribute('color-slice-width', '60');
      await expect.poll(async () => colorRuns(await readRow(line))).toBe(6);

      line.setAttribute('color-slice-width', '0');
      await expect.poll(async () => colorRuns(await readRow(line))).toBe(36);
    });

    test('keeps the color slices in place while their colors cycle', async () => {
      const line = mountRainbowLine({'color-slice-width': '60'});
      const row = await readDrawnRow(line);

      expect(colorEdges(row)).toEqual([60, 120, 180, 240, 300]);

      let next;
      await expect
        .poll(async () => {
          next = await readRow(line);
          return next;
        })
        .not.toEqual(row);
      expect(colorEdges(next)).toEqual([60, 120, 180, 240, 300]);
    });

    test('terminates its worker once it has been removed', async () => {
      const line = mountRainbowLine();
      await readDrawnRow(line);

      line.remove();

      await expect.poll(() => line.worker).toBeUndefined();
    });
  });
}
