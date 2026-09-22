import {build} from 'esbuild';
import inlineWorkerPlugin from 'esbuild-plugin-inline-worker';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {makeBanner} from '../../../scripts/makeBanner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const banner = {js: makeBanner(resolve(__dirname, '..'), 'vanilla')};

const sharedBuildOptions = {
  absWorkingDir: resolve(__dirname, '..'),
  banner,
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'esm',
  target: ['chrome121', 'edge120', 'safari17', 'firefox122'],
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
  entryPoints: ['src/bundle.js'],
  outfile: 'bundle.js',
  plugins: [inlineWorkerPlugin()],
});
