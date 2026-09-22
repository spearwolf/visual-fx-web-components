# @spearwolf/offscreen-display

![npm (scoped)](https://img.shields.io/npm/v/%40spearwolf/offscreen-display) [![License](https://img.shields.io/badge/License-Apache_2.0-yellowgreen.svg)](https://opensource.org/licenses/Apache-2.0)

A minimal javascript library that makes it pretty easy for you to create a _custom element_ that hands its canvas over to a _web worker_ as an [`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) and renders it in the _animation frame_ loop of the browser.

Whether webgl, webgpu or 2d context is up to the user, the class takes care of the synchronization of the element dimension and rendering of the frames.


## 📖 How To

### 1. Install

```sh
➜ npm i @spearwolf/offscreen-display @spearwolf/eventize
```

The worker adds its listeners with `on()` from [@spearwolf/eventize](https://github.com/spearwolf/eventize), that is why it is installed as well.

To get started quickly, [vite](https://vitejs.dev/) is recommended, but this is purely optional and a matter of taste.

> just updated? there is also a [CHANGELOG](https://github.com/spearwolf/visual-fx-web-components/blob/main/packages/offscreen-display/CHANGELOG.md)


### 2. Create custom element

`awesome-display.js`

```javascript
import {OffscreenDisplay} from '@spearwolf/offscreen-display';

class AwesomeDisplay extends OffscreenDisplay {
  createWorker() {
    return new Worker(new URL('awesome-display-worker.js', import.meta.url), {
      type: 'module',
    });
  }
}

customElements.define('awesome-display', AwesomeDisplay);
```

### 3. Integrate the element in your page

`index.html`

```html
<html>
  <body>
    <awesome-display></awesome-display>
    <script type="module" src="awesome-display.js"></script>
  </body>
</html>
```

### 4. Create your worker

`awesome-display-worker.js`

```javascript
import {on} from '@spearwolf/eventize';
import {OffscreenWorkerDisplay} from '@spearwolf/offscreen-display/worker.js';

const display = new OffscreenWorkerDisplay();

let ctx = null;

on(display, {
  onCanvas({canvas}, contextAttributes) {
    ctx = canvas.getContext('2d', contextAttributes);
  },

  onFrame({now, canvasWidth: w, canvasHeight: h, pixelRatio}) {
    // canvasWidth and canvasHeight are physical pixels, pixelRatio converts css pixels into them
    ctx.clearRect(0, 0, w, h);
  },
});

self.addEventListener('message', (evt) => {
  display.parseMessageData(evt.data);
});
```

### 5. More features available

There are other features not listed here. For a complete example, see the [rainbow line element](https://github.com/spearwolf/visual-fx-web-components/tree/main/packages/rainbow-line).


## API

### `OffscreenDisplay` — the element, main thread

- `constructor(initialHTML)` — the initial HTML of the shadow root, `OffscreenDisplay.InitialHTML` by default. It must contain a canvas that gets its displayed size from CSS (the default styles stretch it over the element): the pixel size of the canvas follows its displayed size in physical pixels.
- Hooks to override:
  - `createWorker()` — required, returns the `Worker` that renders the canvas
  - `getContextAttributes()` — the attributes for `getContext()` in the worker; `{alpha: true}` by default, `{alpha: false}` with the attribute `no-alpha`
  - `getInitialWorkerAttributes()` — properties that go into the first message to the worker; none by default
  - `queryCanvasElement()` — finds the canvas in the shadow root, needed with a different initial HTML
- `asNumberValue(name, defaultValue)` — the value of an attribute as a number, the default if the attribute is missing or not a number
- Properties: `worker` (the rendering `Worker`, `undefined` while there is none) and `canvas` (the canvas whose control went to the worker)
- Lifecycle: connecting the element starts the worker. Disconnecting it sends `{isConnected: false}` to the worker, one animation frame later the element calls `dispose()` and the worker is terminated; moving the element within the same task keeps the worker. Connecting the element again after that starts a fresh worker with a fresh canvas.
- `dispose()` — terminates the worker and stops observing the size of the canvas. Public and idempotent.

### `OffscreenWorkerDisplay` — the display, worker

- `parseMessageData(data)` — hand it every message from the main thread: `self.addEventListener('message', (evt) => display.parseMessageData(evt.data))`
- Events:
  - `onCanvas(display, contextAttributes)` — the canvas has arrived
  - `onInit(display)` — the canvas is there and the element is connected
  - `onResize(display)` — the size or the pixel ratio has changed
  - `onFrame(display)` — once per animation frame, only while the element is connected, from the first size on and while the canvas is larger than 0

  `onCanvas`, `onInit` and `onResize` are retained: a listener added later still receives the last one. A throwing listener does not end the frame loop. Its error arrives as an `error` event at the `Worker`; the same error in the following frames arrives only once, until a frame runs without an error.
- Properties: `canvas` (the `OffscreenCanvas`), `canvasWidth` and `canvasHeight` (physical pixels), `pixelRatio` (physical pixels per css pixel), `now` (the time of the current frame in seconds), `isConnected`, `ready` (canvas there and connected)
- `destroy()` — ends the frame loop and releases all listeners, signals and effects; the display ignores every message afterwards

### Messages from the main thread

- `{canvas, contextAttributes, ...getInitialWorkerAttributes()}` — once, when the worker is created
- `{isConnected}` — when the element is connected or disconnected
- `{resize: {width, height, pixelRatio}}` — the size of the canvas in physical pixels and the `devicePixelRatio`

### TypeScript

The package ships type declarations for both entry points. The listeners of the worker are typed with `EventListenerMethods` from `@spearwolf/eventize` and the event map `OffscreenWorkerDisplayEvents`:

```ts
import {type EventListenerMethods, on} from '@spearwolf/eventize';
import {OffscreenWorkerDisplay, type OffscreenWorkerDisplayEvents} from '@spearwolf/offscreen-display/worker.js';

const display = new OffscreenWorkerDisplay();

const listeners: EventListenerMethods<OffscreenWorkerDisplayEvents> = {
  onFrame({now, canvasWidth, canvasHeight, pixelRatio}) {
    // all of them are numbers
  },
};

on(display, listeners);
```

The worker must import `on()` from the same copy of `@spearwolf/eventize` (major version 6) that `@spearwolf/offscreen-display` uses.


## Copyright and License

Copyright &copy; 2024 by [Wolfger Schramm](mailto:wolfger@spearwolf.de?subject=[GitHub]%20@spearwolf/offscreen-display).

The source code and npm package is licensed under the [Apache-2.0 License](./LICENSE).


<small>have fun!</small>
🚀🌱
