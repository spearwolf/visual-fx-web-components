import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

import {inlineWorkerPlugin} from '../../../scripts/esbuildInlineWorkerPlugin.mjs';
import {makeBanner} from '../../../scripts/makeBanner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const banner = {js: makeBanner(resolve(__dirname, '..'), 'vanilla')};

/** @type {import('esbuild').BuildOptions} */
const sharedBuildOptions = {
  absWorkingDir: resolve(__dirname, '..'),
  banner,
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['chrome121', 'edge120', 'safari17', 'firefox122'],
};

/**
 * bundle.js starts its worker from the inlined source instead of from a file next to it
 * @type {import('esbuild').Plugin}
 */
const startInlineWorkerPlugin = {
  name: 'start-inline-worker',
  setup(build) {
    build.onResolve({filter: /^\.\/startWorker\.js$/}, ({resolveDir}) => ({path: resolve(resolveDir, 'startInlineWorker.js')}));
  },
};

await Promise.all([
  build({
    ...sharedBuildOptions,
    entryPoints: ['src/rainbow-line.js'],
    outfile: 'rainbow-line.js',
  }),
  build({
    ...sharedBuildOptions,
    entryPoints: ['src/rainbow-line.worker.js'],
    outfile: 'rainbow-line.worker.js',
  }),
]);

await build({
  ...sharedBuildOptions,
  entryPoints: ['src/rainbow-line.js'],
  outfile: 'bundle.js',
  plugins: [startInlineWorkerPlugin, inlineWorkerPlugin()],
});
