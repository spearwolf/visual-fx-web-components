/** @import {EventListenerMethods} from '@spearwolf/eventize' */
/** @import {OffscreenDisplayMessage, OffscreenWorkerDisplayEvents} from '@spearwolf/offscreen-display/worker.js' */
import {on} from '@spearwolf/eventize';
import {OffscreenWorkerDisplay} from '@spearwolf/offscreen-display/worker.js';
import {
  DEFAULT_COLOR_SLICE_WIDTH,
  DEFAULT_CYCLE_COLORS_REPEAT,
  DEFAULT_SLICE_CYCLE_TIME,
  toPositiveNumber,
} from './attributes.js';

/**
 * The attributes of `<rainbow-line>` as `RainbowLineElement` sends them to its worker. The numeric ones may also be
 * strings; a value that is not a positive number uses the default.
 * @typedef {Object} RainbowLineAttributes
 * @property {number | string} [color-slice-width] the width of a color slice in css pixels; a value below `1` is a
 *   fraction of the line width
 * @property {number | string} [slice-cycle-time] the seconds for the colors to cycle once through a slice
 * @property {1 | -1} [cycle-direction] `1` moves the colors to the left, `-1` to the right
 * @property {string} [cycle-colors] a list of css colors, separated by whitespace or commas; without a valid color the
 *   line shows the rainbow
 * @property {number | string} [cycle-colors-repeat] how often the `cycle-colors` repeat across the width; a value
 *   below `1` counts as its reciprocal
 */

/**
 * A message to the worker of `<rainbow-line>`: the messages of `OffscreenDisplay` together with the attributes of the
 * element.
 * @typedef {OffscreenDisplayMessage & RainbowLineAttributes} RainbowLineMessage
 */

const display = new OffscreenWorkerDisplay();

let colorSliceWidth = DEFAULT_COLOR_SLICE_WIDTH;
let sliceCycleTime = DEFAULT_SLICE_CYCLE_TIME;
let cycleDirection = -1; // right:-1 or left:1
/** @type {string[] | undefined} */
let cycleColors;
let cycleColorsRepeat = DEFAULT_CYCLE_COLORS_REPEAT;

/** @type {OffscreenCanvasRenderingContext2D | null} */
let ctx = null;

const PALETTE_SIZE = 1024;

// a linear gradient through these colors (and back to red) is exactly the hue circle of hsl(h, 100%, 50%)
const RAINBOW_COLORS = ['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f'];

/** @type {OffscreenCanvas | null} */
let palette = null;
/** @type {OffscreenCanvasRenderingContext2D | null} */
let paletteCtx = null;
/** @type {ImageData | null} */
let paletteData = null;

/** @type {OffscreenCanvas | null} */
let strip = null;
/** @type {OffscreenCanvasRenderingContext2D | null} */
let stripCtx = null;
let stripW = 0;
let stripSliceWidth = 0;
let stripRepeat = 0;
/** @type {ImageData | null} */
let stripPaletteData = null;

/** @type {OffscreenCanvas | null} */
let slices = null;
/** @type {OffscreenCanvasRenderingContext2D | null} */
let slicesCtx = null;

/**
 * A cycle-colors-repeat below 1 counts as its reciprocal: 0.5 repeats the colors twice, 0.01 a hundred times.
 * A color cycle cannot be drawn shorter than one physical pixel, so the repetitions end at the canvas width — which
 * also keeps the reciprocal of a denormalized number (Infinity) and huge values out of the arithmetic of the strip.
 * @param {number} value
 * @param {number} width the canvas width in physical pixels
 */
function effectiveRepeat(value, width) {
  return Math.min(value < 1 ? 1 / value : value, width);
}

on(
  display,
  /** @type {EventListenerMethods<OffscreenWorkerDisplayEvents>} */ ({
    onCanvas({canvas}, contextAttributes) {
      ctx = canvas.getContext('2d', contextAttributes);
    },

    onFrame({now, canvasWidth: w, canvasHeight: h, pixelRatio}) {
      // a color-slice-width below 1 is a fraction of the width, from 1 up it is in css pixels and the canvas has physical pixels
      const sliceWidth = Math.min(
        w,
        Math.max(1, Math.round(colorSliceWidth < 1 ? colorSliceWidth * w : colorSliceWidth * pixelRatio)),
      );
      const sliceCount = Math.ceil(w / sliceWidth);
      const repeat = cycleColors === undefined ? 1 : effectiveRepeat(cycleColorsRepeat, w);

      updateStrip(w, sliceWidth, sliceCount, repeat);
      updateSlices(sliceCount);

      const phase = ((now % sliceCycleTime) * cycleDirection) / sliceCycleTime;
      const offset = ((((phase * repeat) % 1) + 1) % 1) * (w / repeat);

      // the slices stay in place and only change their colors: the first drawImage takes the color at the middle of
      // each slice from the strip into one pixel, the second stretches every pixel to the slice width without smoothing
      slicesCtx.imageSmoothingEnabled = false;
      slicesCtx.drawImage(strip, offset, 0, sliceCount * sliceWidth, 1, 0, 0, sliceCount, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(slices, 0, 0, sliceCount, 1, 0, 0, sliceCount * sliceWidth, h);
    },
  }),
);

/**
 * @param {RainbowLineMessage | null | undefined} data a message from the main thread; data that is not an object is
 *   ignored
 */
export function parseMessageData(data) {
  display.parseMessageData(data);

  if (typeof data !== 'object' || data === null) return;

  if ('color-slice-width' in data) {
    colorSliceWidth = toPositiveNumber(data['color-slice-width'], DEFAULT_COLOR_SLICE_WIDTH);
  }
  if ('slice-cycle-time' in data) {
    sliceCycleTime = toPositiveNumber(data['slice-cycle-time'], DEFAULT_SLICE_CYCLE_TIME);
  }
  if ('cycle-direction' in data) {
    cycleDirection = data['cycle-direction'] === 1 ? 1 : -1;
  }
  if ('cycle-colors' in data) {
    setCycleColors(data['cycle-colors']);
  }
  if ('cycle-colors-repeat' in data) {
    cycleColorsRepeat = toPositiveNumber(data['cycle-colors-repeat'], DEFAULT_CYCLE_COLORS_REPEAT);
  }
}

/**
 * Splits a list of css colors at whitespace and commas, but not inside parentheses, so `rgb(255, 0, 0)` stays one color.
 * @param {string} value
 * @returns {string[]}
 */
function splitColorList(value) {
  const tokens = [];
  let token = '';
  let depth = 0;
  for (const char of value) {
    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && (char === ',' || /\s/.test(char))) {
      if (token) tokens.push(token);
      token = '';
      continue;
    }
    token += char;
  }
  if (token) tokens.push(token);
  return tokens;
}

function getPaletteContext() {
  if (paletteCtx == null) {
    palette = new OffscreenCanvas(PALETTE_SIZE, 1);
    paletteCtx = palette.getContext('2d');
  }
  return paletteCtx;
}

/** @param {string} color */
function isValidColor(color) {
  try {
    getPaletteContext().createLinearGradient(0, 0, 1, 0).addColorStop(0, color);
    return true;
  } catch {
    return false;
  }
}

/** @param {unknown} value */
function setCycleColors(value) {
  if (typeof value !== 'string') {
    cycleColors = undefined;
  } else {
    const colors = splitColorList(value).filter((token) => {
      if (isValidColor(token)) return true;
      console.warn(`<rainbow-line> cycle-colors: skipping the invalid color "${token}"`);
      return false;
    });
    if (colors.length === 0) {
      console.warn(`<rainbow-line> cycle-colors: no valid color in "${value}", showing the rainbow`);
      cycleColors = undefined;
    } else {
      cycleColors = colors;
    }
  }
  paletteData = null;
}

/** @param {string[]} colors */
function renderPalette(colors) {
  const context = getPaletteContext();
  const gradient = context.createLinearGradient(0, 0, PALETTE_SIZE, 0);
  for (let i = 0; i < colors.length; i++) {
    gradient.addColorStop(i / colors.length, colors[i]);
  }
  gradient.addColorStop(1, colors[0]);

  context.clearRect(0, 0, PALETTE_SIZE, 1);
  context.fillStyle = gradient;
  context.fillRect(0, 0, PALETTE_SIZE, 1);
  paletteData = context.getImageData(0, 0, PALETTE_SIZE, 1);
}

/**
 * Renders the colors along the canvas width at phase 0 into a strip that is long enough for every phase.
 * Does nothing as long as the width, the slice width, the repetition and the palette stay the same.
 *
 * @param {number} w
 * @param {number} sliceWidth
 * @param {number} sliceCount
 * @param {number} repeat
 */
function updateStrip(w, sliceWidth, sliceCount, repeat) {
  if (paletteData == null) {
    renderPalette(cycleColors ?? RAINBOW_COLORS);
  }
  if (w === stripW && sliceWidth === stripSliceWidth && repeat === stripRepeat && paletteData === stripPaletteData) {
    return;
  }
  stripW = w;
  stripSliceWidth = sliceWidth;
  stripRepeat = repeat;
  stripPaletteData = paletteData;

  const stripWidth = Math.ceil(w / repeat) + sliceCount * sliceWidth;
  if (strip == null) {
    strip = new OffscreenCanvas(stripWidth, 1);
    stripCtx = strip.getContext('2d');
  } else if (strip.width !== stripWidth) {
    strip.width = stripWidth;
  }

  const image = new ImageData(stripWidth, 1);
  const colors = paletteData.data;
  for (let x = 0; x < stripWidth; x++) {
    const u = ((x * repeat) / w) % 1;
    const i = Math.min(PALETTE_SIZE - 1, Math.floor(u * PALETTE_SIZE)) * 4;
    image.data[x * 4] = colors[i];
    image.data[x * 4 + 1] = colors[i + 1];
    image.data[x * 4 + 2] = colors[i + 2];
    // the alpha of the colors is ignored
    image.data[x * 4 + 3] = 255;
  }
  stripCtx.putImageData(image, 0, 0);
}

/** @param {number} sliceCount */
function updateSlices(sliceCount) {
  if (slices == null) {
    slices = new OffscreenCanvas(sliceCount, 1);
    slicesCtx = slices.getContext('2d');
  } else if (slices.width !== sliceCount) {
    slices.width = sliceCount;
  }
}
