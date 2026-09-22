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

  #lastCanvasWidth = 0;
  #lastCanvasHeight = 0;

  #rafID = 0;

  /**
   * @param {string=} [initialHTML] The initial HTML of the shadow root. Should contain a canvas element.
   */
  constructor(initialHTML = OffscreenDisplay.InitialHTML) {
    super();

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.worker = undefined;
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
   * You may want to override this method.
   *
   * @returns {Record<string, unknown>} the unbiased context attributes to be used for the canvas.
   */
  getContextAttributes() {
    if (this.hasAttribute('no-alpha')) {
      return {alpha: false};
    }
    return {alpha: true};
  }

  #readCanvasSize() {
    const clientRect = this.canvas.getBoundingClientRect();
    this.#lastCanvasWidth = clientRect.width;
    this.#lastCanvasHeight = clientRect.height;
    return {width: clientRect.width, height: clientRect.height};
  }

  #ifCanvasSizeChanged(doSomething) {
    const clientRect = this.canvas.getBoundingClientRect();
    if (this.#lastCanvasWidth !== clientRect.width || this.#lastCanvasHeight !== clientRect.height) {
      this.#lastCanvasWidth = clientRect.width;
      this.#lastCanvasHeight = clientRect.height;
      doSomething(clientRect.width, clientRect.height);
    }
  }

  #onFrame = () => {
    this.#ifCanvasSizeChanged((width, height) => {
      this.worker.postMessage({
        resize: {width, height},
      });
    });
    this.#requestAnimationFrame();
  };

  #requestAnimationFrame() {
    this.#rafID = requestAnimationFrame(this.#onFrame);
  }

  #cancelAnimationFrame() {
    cancelAnimationFrame(this.#rafID);
  }

  #setupWorker() {
    this.canvas = this.queryCanvasElement();
    const offscreen = this.canvas.transferControlToOffscreen();
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
   * You may want to override this method.
   *
   * @returns {Record<string, unknown>} the un-opinionated initial attributes to be sent to the worker with the initial `canvas` message event.
   */
  getInitialWorkerAttributes() {
    return {};
  }

  asNumberValue(attributeName, defaultValue) {
    if (this.hasAttribute(attributeName)) {
      const value = parseFloat(this.getAttribute(attributeName));
      return Number.isNaN(value) ? defaultValue : value;
    }
    return defaultValue;
  }

  connectedCallback() {
    if (!this.worker) {
      this.#setupWorker();
    }
    this.worker.postMessage({
      isConnected: true,
      resize: this.#readCanvasSize(),
    });
    this.#requestAnimationFrame();
  }

  disconnectedCallback() {
    this.worker.postMessage({isConnected: false});
    this.#cancelAnimationFrame();
  }

  // TODO adpoptedCallback ?
}
