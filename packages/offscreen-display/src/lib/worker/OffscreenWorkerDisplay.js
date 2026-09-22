import {emit, eventize, off, retain} from '@spearwolf/eventize';
import {batch, createEffect, createSignal, SignalGroup} from '@spearwolf/signalize';

export class OffscreenWorkerDisplay {
  static Canvas = 'onCanvas';
  static Init = 'onInit';
  static Resize = 'onResize';
  static Frame = 'onFrame';

  get ready() {
    return this.canvas && this.isConnected;
  }

  #rafID = 0;

  #contextAttributes = undefined;

  #receivedPixelRatio = 1;

  #hasSize = false;

  #destroyed = false;

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
    } finally {
      // a throwing listener must not end the animation; the error still reaches the main thread as an error event of the worker
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

  parseMessageData(data) {
    if (!data || this.#destroyed) return;

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
