import {emit, eventize, off, retain} from '@spearwolf/eventize';
import {batch, createEffect, createSignal, SignalGroup} from '@spearwolf/signalize';

/**
 * The properties of the messages `OffscreenDisplay` sends to its worker.
 * @typedef {Object} OffscreenDisplayMessageProperties
 * @property {OffscreenCanvas} [canvas] the canvas of the element, transferred once in the first message
 * @property {Record<string, unknown>} [contextAttributes] the attributes for `getContext()`, sent together with `canvas`
 * @property {boolean} [isConnected] whether the element is connected to the document; frames only run while it is
 * @property {{width: number, height: number, pixelRatio?: number}} [resize] the size of the canvas in physical pixels
 *   and their ratio to css pixels
 */

/**
 * A message from the main thread, as `OffscreenDisplay` sends it: first `canvas` together with `contextAttributes`
 * and the attributes of `getInitialWorkerAttributes()`, later `isConnected` and `resize`. Subclasses may add more.
 * @typedef {OffscreenDisplayMessageProperties & Record<string, unknown>} OffscreenDisplayMessage
 */

/**
 * The events of an `OffscreenWorkerDisplay` and the arguments their listeners receive, as an event map for
 * `@spearwolf/eventize` — for example `EventListenerMethods<OffscreenWorkerDisplayEvents>`.
 * @typedef {Object} OffscreenWorkerDisplayEvents
 * @property {[display: OffscreenWorkerDisplay, contextAttributes: Record<string, unknown> | undefined]} onCanvas
 * the canvas has arrived, with the attributes for `getContext()`; retained
 * @property {[display: OffscreenWorkerDisplay]} onInit the canvas is there and the element is connected; retained
 * @property {[display: OffscreenWorkerDisplay]} onResize the size or the pixel ratio has changed; retained
 * @property {[display: OffscreenWorkerDisplay]} onFrame once per animation frame, only while the element is connected,
 *   from the first size on and while the canvas is larger than 0
 */

/**
 * The worker side of an `OffscreenDisplay`: hand it every message from the main thread with `parseMessageData()` and
 * listen to its events with `on()` from `@spearwolf/eventize`; `OffscreenWorkerDisplayEvents` lists them together with
 * the arguments of their listeners.
 */
export class OffscreenWorkerDisplay {
  static Canvas = /** @type {const} */ ('onCanvas');
  static Init = /** @type {const} */ ('onInit');
  static Resize = /** @type {const} */ ('onResize');
  static Frame = /** @type {const} */ ('onFrame');

  /** @returns {boolean} */
  get ready() {
    return this.canvas != null && this.isConnected;
  }

  // declared for the type declarations; the constructor turns them into accessors of signals

  /** @type {OffscreenCanvas | null} */
  canvas;

  /** @type {boolean} */
  isConnected;

  /** @type {number} the canvas width in physical pixels */
  canvasWidth;

  /** @type {number} the canvas height in physical pixels */
  canvasHeight;

  /** @type {number} the ratio of physical pixels to css pixels */
  pixelRatio;

  #rafID = 0;

  /** @type {Record<string, unknown> | undefined} */
  #contextAttributes = undefined;

  #receivedPixelRatio = 1;

  #hasSize = false;

  #destroyed = false;

  // whether the last frame threw and what: an error that repeats frame after frame reaches the main thread only once
  #lastFrameFailed = false;

  /** @type {unknown} */
  #lastFrameError = undefined;

  // the eventize function signatures cannot resolve the polymorphic `this` type, but the concrete class
  get #emitter() {
    return /** @type {OffscreenWorkerDisplay} */ (this);
  }

  constructor() {
    eventize(this);

    const canvas$ = createSignal(null, {attach: this});
    const isConnected$ = createSignal(false, {attach: this});

    const canvasWidth$ = createSignal(0, {attach: this});
    const canvasHeight$ = createSignal(0, {attach: this});
    const pixelRatio$ = createSignal(1, {attach: this});

    Object.defineProperties(this, {
      canvas: {
        get: canvas$.get,
        set: canvas$.set,
        enumerable: true,
      },
      isConnected: {
        get: isConnected$.get,
        set: isConnected$.set,
        enumerable: true,
      },
      canvasWidth: {
        get: canvasWidth$.get,
        set: canvasWidth$.set,
        enumerable: true,
      },
      canvasHeight: {
        get: canvasHeight$.get,
        set: canvasHeight$.set,
        enumerable: true,
      },
      pixelRatio: {
        get: pixelRatio$.get,
        set: pixelRatio$.set,
        enumerable: true,
      },
    });

    /** @type {number} the time of the current frame in seconds */
    this.now = 0;

    retain(this.#emitter, [OffscreenWorkerDisplay.Canvas, OffscreenWorkerDisplay.Init, OffscreenWorkerDisplay.Resize]);

    createEffect(
      () => {
        if (this.canvas) {
          emit(this.#emitter, OffscreenWorkerDisplay.Canvas, this, this.#contextAttributes);
        }
      },
      {dependencies: [canvas$], attach: this},
    );

    createEffect(
      () => {
        if (this.ready) {
          emit(this.#emitter, OffscreenWorkerDisplay.Init, this);
        }
      },
      {dependencies: [canvas$, isConnected$], attach: this},
    );

    createEffect(
      () => {
        emit(this.#emitter, OffscreenWorkerDisplay.Resize, this);
      },
      {dependencies: [canvasWidth$, canvasHeight$, pixelRatio$], attach: this},
    );
  }

  #requestAnimationFrame() {
    if (this.#destroyed) return;
    this.#rafID = requestAnimationFrame((now) => this.#onFrame(now));
  }

  #cancelAnimationFrame() {
    cancelAnimationFrame(this.#rafID);
  }

  /**
   * @param {number} now the timestamp of requestAnimationFrame in milliseconds
   */
  #onFrame(now) {
    try {
      // the frames only start with the first size from the main thread, so nothing is drawn into the default size of the canvas
      if (this.ready && this.#hasSize) {
        // the pixel ratio changes together with the size, so onResize fires once with matching values
        batch(() => {
          this.canvasWidth = this.canvas.width;
          this.canvasHeight = this.canvas.height;
          this.pixelRatio = this.#receivedPixelRatio;
        });

        this.now = now / 1000;

        if (this.canvasWidth > 0 && this.canvasHeight > 0) {
          emit(this.#emitter, OffscreenWorkerDisplay.Frame, this);
        }
      }
      this.#lastFrameFailed = false;
    } catch (error) {
      // the first error of a series reaches the main thread as an error event of the worker; the same error in the
      // following frames is dropped until a frame runs without an error, so a listener that fails in every frame
      // does not send an error event per frame. Errors count as the same when the main thread would read the same
      // message; other thrown values when they are the same value.
      const key = error instanceof Error ? `${error.name}: ${error.message}` : error;
      const repeated = this.#lastFrameFailed && Object.is(key, this.#lastFrameError);
      this.#lastFrameFailed = true;
      this.#lastFrameError = key;
      if (!repeated) throw error;
    } finally {
      // a throwing listener must not end the animation
      this.#requestAnimationFrame();
    }
  }

  /**
   * Ends the frame loop, removes all listeners and retained events and destroys the signals and effects
   * of this display. The instance ignores every message afterwards.
   */
  destroy() {
    this.#destroyed = true;
    this.#cancelAnimationFrame();
    off(this);
    SignalGroup.delete(this);
  }

  /**
   * @param {OffscreenDisplayMessage | null | undefined} data a message from the main thread; data that is not an
   *   object is ignored
   */
  parseMessageData(data) {
    if (typeof data !== 'object' || data === null || this.#destroyed) return;

    if (data.canvas) {
      this.#contextAttributes = data.contextAttributes || undefined;
      this.canvas = data.canvas;
    }

    if ('isConnected' in data) {
      if (this.isConnected !== data.isConnected) {
        this.isConnected = data.isConnected;
        if (this.isConnected) {
          this.#requestAnimationFrame();
        } else {
          this.#cancelAnimationFrame();
        }
      }
    }

    if (data.resize && this.canvas) {
      const width = Math.floor(data.resize.width);
      const height = Math.floor(data.resize.height);
      // assigning a size clears the canvas even if it is the same, so only a real change touches it
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      this.#receivedPixelRatio = data.resize.pixelRatio ?? 1;
      this.#hasSize = true;
    }
  }
}
