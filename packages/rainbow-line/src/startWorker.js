/**
 * Starts the worker of `RainbowLineElement` from the worker source next to this module, with the pattern that bundlers
 * recognise and bundle as a worker. The build of `bundle.js` replaces this module with `startInlineWorker.js`.
 *
 * @returns {Worker}
 */
export function startWorker() {
  return new Worker(new URL('./rainbow-line.worker.js', import.meta.url), {
    type: 'module',
  });
}
