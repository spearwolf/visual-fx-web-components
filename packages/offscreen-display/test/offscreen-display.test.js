import {afterEach, describe, expect, test} from 'vitest';
import {page} from 'vitest/browser';
import {decodePngRow} from '../../../testing/pixels.js';
import {OffscreenDisplay} from '../dist/offscreen-display.js';

class TestDisplay extends OffscreenDisplay {
  events = [];

  createWorker() {
    const worker = new Worker(new URL('./fixtures/test-display.worker.js', import.meta.url), {type: 'module'});
    worker.addEventListener('message', ({data}) => this.events.push(data));
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
    display.worker?.terminate();
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

    await expect.poll(() => display.eventsOf('resize').at(-1)).toEqual({event: 'resize', width: 320, height: 240});

    display.style.width = '200px';
    display.style.height = '100px';

    await expect.poll(() => display.eventsOf('resize').at(-1)).toEqual({event: 'resize', width: 200, height: 100});
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

  test('stops rendering frames while disconnected and resumes on reconnect', async () => {
    const display = mountDisplay();

    await expect.poll(() => display.eventsOf('frame').length).toBeGreaterThan(2);

    display.remove();
    await sleep(100);
    const framesWhileDisconnected = display.eventsOf('frame').length;
    await sleep(300);
    expect(display.eventsOf('frame').length).toBe(framesWhileDisconnected);

    document.body.appendChild(display);

    await expect.poll(() => display.eventsOf('frame').length).toBeGreaterThan(framesWhileDisconnected + 2);
  });
});
