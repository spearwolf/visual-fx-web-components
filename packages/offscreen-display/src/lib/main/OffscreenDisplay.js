export class OffscreenDisplay extends HTMLElement {
  static InitialHTML = `
    <style>
      :host {
        display: block;
        width: 320px;
        height: 240px;
      }
      .frame {
        position: relative;
        height: 100%;
      }
      canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }
    </style>
    <div class="frame">
      <canvas></canvas>
    </div>
  `;

  #resizeObserver = new ResizeObserver((entries) => this.#onCanvasResize(entries));

  /** @type {'device-pixel-content-box' | 'content-box' | undefined} */
  #observedBox = undefined;

  /** @type {MediaQueryList | undefined} */
  #pixelRatioQuery = undefined;

  #disposeRafID = 0;

  #canvasTransferred = false;

  /**
   * @param {string=} [initialHTML] The initial HTML of the shadow root. Should contain a canvas element.
   *   The canvas must get its displayed size from CSS (the default styles stretch it over the element):
   *   its pixel size follows the displayed size in physical pixels, so a canvas that sizes itself by its
   *   intrinsic size would grow with every resize.
   */
  constructor(initialHTML = OffscreenDisplay.InitialHTML) {
    super();

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    /** @type {Worker | undefined} the rendering worker, from connecting the element until dispose() */
    this.worker = undefined;

    /**
     * @type {HTMLCanvasElement | undefined} the canvas whose control went to the worker;
     *   a reconnect after dispose() brings a fresh one
     */
    this.canvas = undefined;
  }

  /**
   * You may want to override this method if you provide a different initial HTML.
   *
   * @returns {HTMLCanvasElement} The canvas element in the shadow root.
   */
  queryCanvasElement() {
    return this.shadow.querySelector('canvas');
  }

  /**
   * Must be implemented by subclass to create a Worker instance.
   *
   * @returns {Worker} the worker instance to be used for rendering.
   *
   * @example
   * ```js
   *   createWorker() {
   *     return new Worker(new URL("./rainbow-line.worker.js", import.meta.url), {type: "module"});
   *   }
   * ```
   */
  createWorker() {
    throw new Error('createWorker() must be implemented by subclass');
  }

  /**
   * The attributes for `getContext()` in the worker, where they arrive as `contextAttributes` of `onCanvas`.
   * You may want to override this method.
   *
   * @returns {Record<string, unknown>} `{alpha: true}` by default, `{alpha: false}` with the attribute `no-alpha`.
   */
  getContextAttributes() {
    if (this.hasAttribute('no-alpha')) {
      return {alpha: false};
    }
    return {alpha: true};
  }

  #observeCanvas() {
    try {
      this.#resizeObserver.observe(this.canvas, {box: 'device-pixel-content-box'});
      this.#observedBox = 'device-pixel-content-box';
    } catch {
      // WebKit does not support this box and throws a TypeError
      this.#resizeObserver.observe(this.canvas, {box: 'content-box'});
      this.#observedBox = 'content-box';
    }
    this.#watchPixelRatio();
  }

  #unobserveCanvas() {
    this.#resizeObserver.disconnect();
    this.#pixelRatioQuery?.removeEventListener('change', this.#onPixelRatioChange);
    this.#pixelRatioQuery = undefined;
  }

  /**
   * @param {ResizeObserverEntry[]} entries
   */
  #onCanvasResize(entries) {
    // only the canvas is observed, so the last entry is its latest size
    const entry = entries.at(-1);
    const pixelRatio = window.devicePixelRatio;
    let width;
    let height;
    // chromium fills devicePixelContentBoxSize for a content-box observation too, so the branch depends on
    // what was requested and not on what the entry carries
    if (this.#observedBox === 'device-pixel-content-box') {
      width = entry.devicePixelContentBoxSize[0].inlineSize;
      height = entry.devicePixelContentBoxSize[0].blockSize;
    } else {
      width = Math.round(entry.contentRect.width * pixelRatio);
      height = Math.round(entry.contentRect.height * pixelRatio);
    }
    this.worker?.postMessage({resize: {width, height, pixelRatio}});
  }

  #watchPixelRatio() {
    this.#pixelRatioQuery?.removeEventListener('change', this.#onPixelRatioChange);
    this.#pixelRatioQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    this.#pixelRatioQuery.addEventListener('change', this.#onPixelRatioChange);
  }

  // a new observation reports the size once more — with the content-box fallback this is the only way to
  // notice a change of the devicePixelRatio (zoom, another screen) that does not change the css size
  #onPixelRatioChange = () => {
    this.#resizeObserver.unobserve(this.canvas);
    this.#observeCanvas();
  };

  #setupWorker() {
    let canvas = this.queryCanvasElement();
    if (this.#canvasTransferred) {
      // the control of a canvas can only be transferred once, a new worker needs a new canvas element
      const freshCanvas = /** @type {HTMLCanvasElement} */ (canvas.cloneNode(false));
      canvas.replaceWith(freshCanvas);
      canvas = freshCanvas;
    }
    this.canvas = canvas;
    const offscreen = canvas.transferControlToOffscreen();
    this.#canvasTransferred = true;
    this.worker = this.createWorker();
    this.worker.postMessage(
      {
        canvas: offscreen,
        contextAttributes: this.getContextAttributes(),
        ...this.getInitialWorkerAttributes(),
      },
      [offscreen],
    );
  }

  /**
   * Properties that go into the first message to the worker, together with `canvas` and `contextAttributes`;
   * the worker receives them in `parseMessageData()`. You may want to override this method.
   *
   * @returns {Record<string, unknown>} none by default.
   */
  getInitialWorkerAttributes() {
    return {};
  }

  /**
   * @param {string} attributeName
   * @param {number} defaultValue
   * @returns {number} the value of the attribute as parsed by `parseFloat`, the default if the attribute is missing
   *   or not a number.
   */
  asNumberValue(attributeName, defaultValue) {
    if (this.hasAttribute(attributeName)) {
      const value = parseFloat(this.getAttribute(attributeName));
      return Number.isNaN(value) ? defaultValue : value;
    }
    return defaultValue;
  }

  connectedCallback() {
    cancelAnimationFrame(this.#disposeRafID);
    if (!this.worker) {
      this.#setupWorker();
    }
    this.worker.postMessage({isConnected: true});
    this.#observeCanvas();
  }

  disconnectedCallback() {
    this.#unobserveCanvas();
    if (!this.worker) return;
    this.worker.postMessage({isConnected: false});
    // moving the element (remove and insert within the same task) keeps the worker; it is only terminated
    // when the element is still disconnected one animation frame later
    this.#disposeRafID = requestAnimationFrame(() => {
      if (!this.isConnected) this.dispose();
    });
  }

  /**
   * Terminates the worker and stops observing the size of the canvas. Idempotent.
   *
   * The element calls it by itself one animation frame after it was removed from the document.
   * Connecting the element again afterwards starts a fresh worker with a fresh canvas.
   */
  dispose() {
    cancelAnimationFrame(this.#disposeRafID);
    this.#unobserveCanvas();
    this.worker?.terminate();
    this.worker = undefined;
  }

  // TODO adpoptedCallback ?
}
