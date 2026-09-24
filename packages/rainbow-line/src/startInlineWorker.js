// @ts-expect-error the default export, a worker factory, is created by the inline worker plugin of the build
import createInlineWorker from './rainbow-line.worker.js';

// stands in for startWorker.js in the build of bundle.js, so the bundle carries no url of a worker file that a
// bundler of the consumer would emit next to it

/** @returns {Worker} */
export function startWorker() {
  return createInlineWorker();
}
