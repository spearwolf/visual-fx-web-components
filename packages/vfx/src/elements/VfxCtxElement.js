export class VfxCtxElement extends HTMLElement {
  static InitialHTML = `
    <p><code>vfx-ctx</code></p>
    <slot></slot>
  `;

  constructor(initialHTML = VfxCtxElement.InitialHTML) {
    super();

    this.shadow = this.attachShadow({mode: 'open'});
    this.shadow.innerHTML = initialHTML;

    this.worker = undefined;
  }

  connectedCallback() {
    if (!this.worker) {
      this.#setupWorker();
    }
  }

  disconnectedCallback() {
    this.worker.postMessage({
      message: 'bye bye!',
    });
    this.worker?.terminate();
    this.worker = undefined;
  }

  createWorker() {
    return new Worker(new URL('../vfx.worker.js', import.meta.url), {type: 'module'});
  }

  #setupWorker() {
    this.worker = this.createWorker();
    this.worker.postMessage({
      message: 'hello hello',
      importVfxSrc: new URL(this.getAttribute('src'), window.location).href,
    });
  }
}
