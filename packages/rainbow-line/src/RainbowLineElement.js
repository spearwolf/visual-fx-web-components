import {OffscreenDisplay} from '@spearwolf/offscreen-display';
import {
  DEFAULT_COLOR_SLICE_WIDTH,
  DEFAULT_CYCLE_COLORS_REPEAT,
  DEFAULT_SLICE_CYCLE_TIME,
  toPositiveNumber,
} from './attributes.js';
import {startWorker} from './startWorker.js';

/** @param {string | null} direction */
const toCycleDirection = (direction) => (direction === 'left' ? 1 : -1);

/** @param {string | null} colors */
const toCycleColors = (colors) => (typeof colors === 'string' ? colors.trim() || undefined : undefined);

const OBSERVED_ATTRIBUTES = ['color-slice-width', 'slice-cycle-time', 'cycle-direction', 'cycle-colors', 'cycle-colors-repeat'];

/**
 * @param {string} name
 * @param {string | null} value the attribute value, null if the attribute is missing
 */
function toWorkerValue(name, value) {
  switch (name) {
    case 'cycle-direction':
      return toCycleDirection(value);
    case 'cycle-colors':
      return toCycleColors(value);
    case 'color-slice-width':
      return toPositiveNumber(value, DEFAULT_COLOR_SLICE_WIDTH);
    case 'slice-cycle-time':
      return toPositiveNumber(value, DEFAULT_SLICE_CYCLE_TIME);
    case 'cycle-colors-repeat':
      return toPositiveNumber(value, DEFAULT_CYCLE_COLORS_REPEAT);
  }
}

export class RainbowLineElement extends OffscreenDisplay {
  static observedAttributes = OBSERVED_ATTRIBUTES;

  constructor() {
    super(`
      <style>
        :host {
          display: block;
          width: 100%;
          height: 3px;
        }
        .rainbow {
          position: relative;
          height: 100%;
          background: linear-gradient(in hsl longer hue 45deg, #f00 0 0);
        }
        canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      </style>
      <div class="rainbow">
        <canvas></canvas>
      </div>`);
  }

  createWorker() {
    return startWorker();
  }

  getContextAttributes() {
    return {alpha: false};
  }

  getInitialWorkerAttributes() {
    return Object.fromEntries(OBSERVED_ATTRIBUTES.map((name) => [name, toWorkerValue(name, this.getAttribute(name))]));
  }

  /**
   * @param {string} name
   * @param {string | null} _oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, _oldValue, newValue) {
    if (!this.worker) return;

    this.worker.postMessage({[name]: toWorkerValue(name, newValue)});
  }
}
