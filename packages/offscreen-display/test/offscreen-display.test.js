import {afterEach, describe, expect, test} from 'vitest';
import {page} from 'vitest/browser';
import {decodePngRow} from '../../../testing/pixels.js';
import {OffscreenDisplay} from '../dist/offscreen-display.js';
import {OffscreenWorkerDisplay} from '../dist/offscreen-display-worker.js';

class TestDisplay extends OffscreenDisplay {
  events = [];
  errors = [];
  terminatedWorkers = [];

  createWorker() {
    const worker = new Worker(new URL('./fixtures/test-display.worker.js', import.meta.url), {type: 'module'});
    worker.addEventListener('message', ({data}) => this.events.push(data));
    worker.addEventListener('error', (event) => {
      // otherwise the browser reports it as an unhandled error of the page and vitest aborts the run
      event.preventDefault();
      this.errors.push(event.message);
    });
    const terminate = worker.terminate.bind(worker);
    worker.terminate = () => {
      this.terminatedWorkers.push(worker);
      terminate();
    };
    return worker;
  }

  getInitialWorkerAttributes() {
    return {greeting: 'hej'};
  }

  eventsOf(name) {
    return this.events.filter(({event}) => event === name);
  }

  lastFrame() {
    return this.eventsOf('frame').at(-1);
  }

  frameCount() {
    return this.eventsOf('frame').length;
  }
}

customElements.define('test-display', TestDisplay);

class DisplayWithoutWorker extends OffscreenDisplay {}

customElements.define('display-without-worker', DisplayWithoutWorker);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @returns {TestDisplay} */
function mountDisplay(attributes = {}) {
  const display = document.createElement('test-display');
  for (const [name, value] of Object.entries(attributes)) {
    display.setAttribute(name, value);
  }
  document.body.appendChild(display);
  return display;
}

async function readMiddlePixel(element) {
  const base64 = await page.screenshot({element, save: false});
  const row = await decodePngRow(base64);
  return row[Math.floor(row.length / 2)];
}

afterEach(() => {
  for (const display of document.querySelectorAll('test-display')) {
    display.remove();
  }
});

describe('OffscreenDisplay', () => {
  test('renders a canvas inside its shadow root with a default size of 320x240', () => {
    const display = mountDisplay();

    expect(display.shadowRoot.querySelector('canvas')).toBeInstanceOf(HTMLCanvasElement);
    expect(display.queryCanvasElement()).toBe(display.shadowRoot.querySelector('canvas'));

    const {width, height} = display.getBoundingClientRect();
    expect({width, height}).toEqual({width: 320, height: 240});
  });

  test('createWorker() must be implemented by a subclass', () => {
    const display = document.createElement('display-without-worker');
    expect(() => display.createWorker()).toThrow('createWorker() must be implemented by subclass');
  });

  test('asNumberValue() parses numeric attributes and falls back to the default', () => {
    const display = document.createElement('test-display');
    display.setAttribute('speed', '2.5');
    display.setAttribute('broken', 'plah');

    expect(display.asNumberValue('speed', 1)).toBe(2.5);
    expect(display.asNumberValue('broken', 1)).toBe(1);
    expect(display.asNumberValue('missing', 7)).toBe(7);
  });
});

describe('OffscreenDisplay + OffscreenWorkerDisplay', () => {
  test('transfers the canvas to the worker together with the context and initial attributes', async () => {
    const display = mountDisplay();

    await expect.poll(() => display.eventsOf('canvas')).toEqual([{event: 'canvas', contextAttributes: {alpha: true}}]);
    expect(display.eventsOf('initialAttributes')).toEqual([{event: 'initialAttributes', initialAttributes: {greeting: 'hej'}}]);
  });

  test('the no-alpha attribute requests an opaque context', async () => {
    const display = mountDisplay({'no-alpha': ''});

    await expect.poll(() => display.eventsOf('canvas')[0]?.contextAttributes).toEqual({alpha: false});
  });

  test('emits onInit once the canvas is there and the element is connected', async () => {
    const display = mountDisplay();

    await expect.poll(() => display.eventsOf('init').length).toBe(1);
  });

  test('resizes the offscreen canvas to the size of the element', async () => {
    const display = mountDisplay();

    await expect.poll(() => display.eventsOf('resize').at(-1)).toEqual({event: 'resize', width: 320, height: 240, pixelRatio: 1});

    display.style.width = '200px';
    display.style.height = '100px';

    await expect.poll(() => display.eventsOf('resize').at(-1)).toEqual({event: 'resize', width: 200, height: 100, pixelRatio: 1});
    await expect.poll(() => display.lastFrame()).toMatchObject({width: 200, height: 100});
  });

  test('emits onFrame continuously with the time in seconds', async () => {
    const display = mountDisplay();

    await expect.poll(() => display.eventsOf('frame').length).toBeGreaterThan(5);

    const frames = display.eventsOf('frame');
    const [first, last] = [frames[0], frames.at(-1)];
    expect(last.now).toBeGreaterThan(first.now);
    // a handful of animation frames take a fraction of a second, which would be a far bigger number in milliseconds
    expect(last.now - first.now).toBeLessThan(5);
  });

  test('what the worker draws shows up in the element', async () => {
    const display = mountDisplay();

    await expect.poll(() => readMiddlePixel(display)).toEqual([255, 0, 0]);

    display.worker.postMessage({fillStyle: '#0000ff'});

    await expect.poll(() => readMiddlePixel(display)).toEqual([0, 0, 255]);
  });

  test('keeps its worker when it is moved to another place in the document', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);
    const worker = display.worker;

    const container = document.createElement('div');
    document.body.appendChild(container);
    try {
      container.append(display);
      const framesAfterMove = display.frameCount();

      await expect.poll(() => display.frameCount()).toBeGreaterThan(framesAfterMove + 2);
      expect(display.worker).toBe(worker);
      expect(display.terminatedWorkers).toEqual([]);
    } finally {
      container.remove();
    }
  });

  test('the worker stops its frames on {isConnected: false} and resumes them on {isConnected: true}', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);

    // the element stays in the document, only the worker side of the message is under test
    display.worker.postMessage({isConnected: false});

    await expect.poll(() => display.eventsOf('isConnected')).toContainEqual({event: 'isConnected', isConnected: false});
    const framesWhileDisconnected = display.frameCount();
    // the absence of frames can only be observed by waiting a fixed time
    await sleep(300);
    expect(display.frameCount()).toBe(framesWhileDisconnected);

    display.worker.postMessage({isConnected: true});

    await expect.poll(() => display.frameCount()).toBeGreaterThan(framesWhileDisconnected + 2);
    expect(display.terminatedWorkers).toEqual([]);
  });

  test('terminates its worker one animation frame after it was removed', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.eventsOf('init').length).toBe(1);
    const worker = display.worker;

    display.remove();

    await expect.poll(() => display.worker).toBeUndefined();
    expect(display.terminatedWorkers).toEqual([worker]);
  });

  test('starts a fresh worker with a fresh canvas when it is connected again', async () => {
    const display = mountDisplay();
    await expect.poll(() => readMiddlePixel(display)).toEqual([255, 0, 0]);
    const oldWorker = display.worker;
    const oldCanvas = display.canvas;

    display.remove();
    await expect.poll(() => display.worker).toBeUndefined();

    document.body.appendChild(display);

    expect(display.worker).toBeDefined();
    expect(display.worker).not.toBe(oldWorker);
    expect(display.canvas).not.toBe(oldCanvas);
    expect(display.shadowRoot.querySelectorAll('canvas')).toHaveLength(1);
    expect(display.queryCanvasElement()).toBe(display.canvas);
    await expect.poll(() => readMiddlePixel(display)).toEqual([255, 0, 0]);
  });

  test('dispose() terminates the worker of a connected element', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);
    const worker = display.worker;

    display.dispose();

    expect(display.worker).toBeUndefined();
    expect(display.terminatedWorkers).toContain(worker);

    const framesAfterDispose = display.frameCount();
    // the absence of frames can only be observed by waiting a fixed time
    await sleep(300);
    expect(display.frameCount()).toBe(framesAfterDispose);

    expect(() => display.remove()).not.toThrow();
  });

  test('keeps rendering frames after an onFrame listener threw', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);

    display.worker.postMessage({throwInNextFrame: true});

    await expect.poll(() => display.errors).toContainEqual(expect.stringMatching(/boom from onFrame/));
    const framesAfterError = display.frameCount();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(framesAfterError + 2);
  });

  test('reports an error that repeats in every frame once, until a frame runs without it', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);
    const failingFrames = () => display.eventsOf('failingFrame').length;

    display.worker.postMessage({throwInEveryFrame: 'boom in every frame'});
    await expect.poll(() => display.errors).toHaveLength(1);
    const failingFramesBefore = failingFrames();
    await expect.poll(failingFrames).toBeGreaterThan(failingFramesBefore + 5);
    expect(display.errors).toHaveLength(1);
    expect(display.errors[0]).toMatch(/boom in every frame/);

    // another error is reported at once, even while the series goes on
    display.worker.postMessage({throwInEveryFrame: 'another boom'});
    await expect.poll(() => display.errors).toHaveLength(2);
    expect(display.errors[1]).toMatch(/another boom/);

    // after a frame without an error, the same error opens a new series
    display.worker.postMessage({throwInEveryFrame: false});
    const framesBefore = display.frameCount();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(framesBefore + 2);
    display.worker.postMessage({throwInEveryFrame: 'another boom'});
    await expect.poll(() => display.errors).toHaveLength(3);
  });

  test('reports a thrown value that is not an Error once while the same value repeats in every frame', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);
    const failingFrames = () => display.eventsOf('failingFrame').length;

    display.worker.postMessage({throwValueInEveryFrame: 'plain boom'});
    await expect.poll(() => display.errors).toHaveLength(1);
    const failingFramesBefore = failingFrames();
    await expect.poll(failingFrames).toBeGreaterThan(failingFramesBefore + 5);
    expect(display.errors).toHaveLength(1);
    expect(display.errors[0]).toMatch(/plain boom/);

    // another value is reported at once, even while the series goes on
    display.worker.postMessage({throwValueInEveryFrame: 'another plain boom'});
    await expect.poll(() => display.errors).toHaveLength(2);
    expect(display.errors[1]).toMatch(/another plain boom/);
  });

  test('destroy() ends the frame loop and releases the signals of the display', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);

    display.worker.postMessage({destroy: true});

    await expect.poll(() => display.eventsOf('destroyed')).toHaveLength(1);
    const [{signalsBefore, signalsAfter}] = display.eventsOf('destroyed');
    // the five signals of the display instance
    expect(signalsAfter).toBe(signalsBefore - 5);

    const framesAfterDestroy = display.frameCount();
    await sleep(300);
    expect(display.frameCount()).toBe(framesAfterDestroy);
  });

  test('measures the canvas in css pixels times devicePixelRatio where the device pixel box is not supported', async () => {
    const {observe} = ResizeObserver.prototype;
    ResizeObserver.prototype.observe = function (target, options) {
      if (options?.box === 'device-pixel-content-box') {
        throw new TypeError('device-pixel-content-box is not supported');
      }
      return observe.call(this, target, options);
    };
    // a ratio that differs from the one the page renders with: the device pixel box would still report 320x240,
    // only the content box times the ratio makes 640x480
    const devicePixelRatio = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    Object.defineProperty(window, 'devicePixelRatio', {configurable: true, get: () => 2});
    try {
      const display = mountDisplay();

      await expect
        .poll(() => display.eventsOf('resize').at(-1))
        .toEqual({event: 'resize', width: 640, height: 480, pixelRatio: 2});
    } finally {
      ResizeObserver.prototype.observe = observe;
      if (devicePixelRatio) {
        Object.defineProperty(window, 'devicePixelRatio', devicePixelRatio);
      } else {
        Reflect.deleteProperty(window, 'devicePixelRatio');
      }
    }
  });
});

describe('OffscreenWorkerDisplay', () => {
  test('parseMessageData() ignores message data that is not an object', () => {
    const display = new OffscreenWorkerDisplay();
    try {
      for (const data of [null, undefined, 0, 42, '', 'resize', true]) {
        expect(() => display.parseMessageData(data)).not.toThrow();
      }
    } finally {
      display.destroy();
    }
  });
});
