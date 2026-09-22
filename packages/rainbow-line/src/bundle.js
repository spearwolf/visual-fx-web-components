import {RainbowLineElement} from './RainbowLineElement.js';

// @ts-expect-error the default export, a worker factory, is created by the inline worker plugin of the build
import Worker from './rainbow-line.worker.js';

class RainbowLineElementWithWorker extends RainbowLineElement {
  createWorker() {
    return Worker();
  }
}

customElements.define('rainbow-line', RainbowLineElementWithWorker);
