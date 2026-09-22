// Helpers for asserting what an OffscreenCanvas actually drew: the main thread cannot read back a canvas
// whose control was transferred to a worker, so the tests take a screenshot and analyse one row of it.

/**
 * Decodes a base64 png and returns the rgb pixels of one row (default: the middle one).
 *
 * Runs in a browser and is self-contained, so it can also be passed to playwright's `page.evaluate()`.
 *
 * @param {string} base64Png
 * @param {number} [y]
 * @returns {Promise<Array<[number, number, number]>>}
 */
export async function decodePngRow(base64Png, y) {
  const img = new Image();
  img.src = `data:image/png;base64,${base64Png}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const row = y ?? Math.floor(canvas.height / 2);
  const {data} = ctx.getImageData(0, row, canvas.width, 1);
  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  return pixels;
}

/**
 * @param {[number, number, number]} rgb
 * @returns {number | undefined} the hue in degrees, or undefined for (nearly) unsaturated colors
 */
export function hueOf([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 32) return undefined;
  let hue;
  if (max === r) {
    hue = ((g - b) / delta) % 6;
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

/**
 * @param {Array<[number, number, number]>} pixels
 * @param {number} [bucketCount]
 * @returns {Set<number>} the indices of all hue segments that occur in the pixels
 */
export function hueBuckets(pixels, bucketCount = 12) {
  const buckets = new Set();
  for (const pixel of pixels) {
    const hue = hueOf(pixel);
    if (hue !== undefined) {
      buckets.add(Math.floor(hue / (360 / bucketCount)) % bucketCount);
    }
  }
  return buckets;
}

/**
 * @param {Array<[number, number, number]>} pixels
 * @returns {number} the number of runs of identical adjacent colors
 */
export function colorRuns(pixels) {
  let runs = 0;
  let prev;
  for (const [r, g, b] of pixels) {
    const color = (r << 16) | (g << 8) | b;
    if (color !== prev) {
      runs++;
      prev = color;
    }
  }
  return runs;
}

/**
 * @param {Array<[number, number, number]>} pixels
 * @returns {boolean} true if at least one pixel is not (nearly) black
 */
export function hasDrawnSomething(pixels) {
  return pixels.some(([r, g, b]) => r + g + b > 48);
}
