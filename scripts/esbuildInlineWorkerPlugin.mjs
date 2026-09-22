import * as esbuild from 'esbuild';

const WORKER_FILTER = /\.worker\.js$/;
const RUNTIME_NAMESPACE = 'inline-worker-runtime';

// the worker is created as a classic worker from a blob url, so it is bundled as an iife without any imports
const runtimeCode = `
export default function createInlineWorker(scriptText) {
  const url = URL.createObjectURL(new Blob([scriptText], {type: 'text/javascript'}));
  const worker = new Worker(url);
  URL.revokeObjectURL(url);
  return worker;
}
`;

/**
 * Replaces every import of a `*.worker.js` module with a default export function that
 * creates the worker from its own separately bundled source, inlined as a string.
 *
 * @param {import('esbuild').BuildOptions} [workerBuildOptions] extra options for the worker bundle
 * @returns {import('esbuild').Plugin}
 */
export function inlineWorkerPlugin(workerBuildOptions = {}) {
  return {
    name: 'inline-worker',

    setup(build) {
      const {target, minify, absWorkingDir} = build.initialOptions;

      build.onLoad({filter: WORKER_FILTER}, async ({path}) => {
        const result = await esbuild.build({
          absWorkingDir,
          target,
          minify,
          ...workerBuildOptions,
          entryPoints: [path],
          bundle: true,
          format: 'iife',
          write: false,
        });

        return {
          contents: `import createInlineWorker from '${RUNTIME_NAMESPACE}';
export default function Worker() {
  return createInlineWorker(${JSON.stringify(result.outputFiles[0].text)});
}
`,
          loader: 'js',
        };
      });

      build.onResolve({filter: new RegExp(`^${RUNTIME_NAMESPACE}$`)}, ({path}) => ({path, namespace: RUNTIME_NAMESPACE}));
      build.onLoad({filter: /.*/, namespace: RUNTIME_NAMESPACE}, () => ({contents: runtimeCode, loader: 'js'}));
    },
  };
}
