import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('esbuild').BuildOptions} */
const sharedBuildOptions = {
  absWorkingDir: resolve(__dirname, '..'),
  bundle: true,
  minify: false,
  sourcemap: false,
  format: 'esm',
  target: ['chrome121', 'edge120', 'safari17', 'firefox122'],
  external: ['@spearwolf/eventize', '@spearwolf/signalize'],
};

await Promise.all([
  esbuild.build({
    ...sharedBuildOptions,
    entryPoints: ['src/index.js'],
    outfile: 'dist/offscreen-display.js',
  }),
  esbuild.build({
    ...sharedBuildOptions,
    entryPoints: ['src/worker.js'],
    outfile: 'dist/offscreen-display-worker.js',
  }),
]);
