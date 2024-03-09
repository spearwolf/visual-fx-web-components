import {eventize} from '@spearwolf/eventize';
import '@spearwolf/shadow-ents/shadow-entity.js';
import {connect, createSignal, value} from '@spearwolf/signalize';
import {FrameLoop} from '../shared/FrameLoop.js';

const InitialHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .frame {
      position: relative;
      height: 100%;
    }
    .content {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
  </style>
  <div class="frame">
    <canvas id="display" class="content"></canvas>
    <div class="content">
      <shadow-entity id="entity" token="vfx-display">
        <slot></slot>
      </shadow-entity>
    </div>
  </div>
`;

const shadowEntity$ = 'shadowEntity';
const viewComponent$ = 'viewComponent';

const DISPLAY_ID = 'display';

export class VfxDisplayElement extends HTMLElement {
  #frameLoop = new FrameLoop();

  constructor(initialHTML = InitialHTML) {
    super();
    eventize(this);

    this.retain(shadowEntity$, viewComponent$);

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.canvas = this.shadow.getElementById(DISPLAY_ID);

    const [getShadowEntityElement, setShadowEntityElement] = createSignal();
    const [getViewComponent, setViewComponent] = createSignal();

    Object.defineProperties(this, {
      shadowEntity: {
        enumerable: true,
        get() {
          return value(getShadowEntityElement);
        },
        set(value) {
          setShadowEntityElement(value);
        },
      },
      viewComponent: {
        enumerable: true,
        get() {
          return value(getViewComponent);
        },
        set(value) {
          setViewComponent(value);
        },
      },
    });

    getShadowEntityElement((el) => {
      if (el) {
        const con = connect(el.viewComponent$, getViewComponent);
        this.emit(shadowEntity$, el);
        return () => {
          con.destroy();
        };
      } else {
        this.retainClear(shadowEntity$);
      }
    });

    getViewComponent((vc) => {
      if (vc) {
        this.emit(viewComponent$, vc);
      }
    });

    customElements.whenDefined('shadow-entity').then(() => {
      setShadowEntityElement(this.shadow.getElementById('entity'));
    });

    this.on(viewComponent$, this.transferCanvasToWorker.bind(this));
  }

  connectedCallback() {
    this.#frameLoop.subscribe(this);

    this.once(shadowEntity$, (el) => {
      el.sendShadowEvent('start');
    });
  }

  disconnectedCallback() {
    this.#frameLoop.unsubscribe(this);

    this.once(shadowEntity$, (el) => {
      el.sendShadowEvent('stop');
    });
  }

  #lastCanvasWidth = 0;
  #lastCanvasHeight = 0;

  onFrame() {
    const clientRect = this.canvas.getBoundingClientRect();
    if (this.#lastCanvasWidth !== clientRect.width || this.#lastCanvasHeight !== clientRect.height) {
      this.#lastCanvasWidth = clientRect.width;
      this.#lastCanvasHeight = clientRect.height;
      if (this.viewComponent) {
        this.viewComponent.setProperty('canvasWidth', clientRect.width);
        this.viewComponent.setProperty('canvasHeight', clientRect.height);
        this.shadowEntity.shadowEnvElement?.update();
      }
    }
  }

  transferCanvasToWorker() {
    const offscreen = this.canvas.transferControlToOffscreen();
    this.shadowEntity.sendShadowEvent('offscreenCanvas', {canvas: offscreen}, [offscreen]);
  }
}
