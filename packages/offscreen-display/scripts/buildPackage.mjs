import fs from 'node:fs';
import {dirname, resolve} from 'node:path';
import {chdir} from 'node:process';
import {fileURLToPath} from 'node:url';

const projectRoot = dirname(resolve(fileURLToPath(import.meta.url), '..'));
const packageRoot = resolve(projectRoot, '.npm-pkg');

console.log('projectRoot:', projectRoot);
console.log('packageRoot:', packageRoot);
console.log('- - -');

chdir(projectRoot);

const COPY_FILES = ['dist/offscreen-display-worker.js', 'dist/offscreen-display.js', 'LICENSE', 'README.md', 'CHANGELOG.md'];

fs.mkdirSync(resolve(packageRoot, 'dist'), {recursive: true});

for (const filename of COPY_FILES) {
  copyFile(resolve(projectRoot, filename), resolve(packageRoot, filename));
}

// no existence check: without the type declarations the package must not be built
fs.cpSync(resolve(projectRoot, 'dist/types'), resolve(packageRoot, 'dist/types'), {recursive: true});

/**
 * @param {string} src
 * @param {string} dst
 */
function copyFile(src, dst) {
  if (fs.existsSync(src)) {
    console.log('Write to', dst);
    fs.copyFileSync(src, dst);
  }
}
