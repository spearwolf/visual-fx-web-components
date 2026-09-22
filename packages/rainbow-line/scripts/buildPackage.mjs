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

const COPY_FILES = [
  'src/RainbowLineElement.js',
  'src/RainbowLineWorkerDisplay.js',
  'LICENSE',
  'README.md',
  'CHANGELOG.md',
  'example.html',
  'rainbow-line.worker.js',
  'rainbow-line.js',
  'bundle.js',
];

fs.mkdirSync(resolve(packageRoot, 'src'), {recursive: true});

for (const filename of COPY_FILES) {
  copyFile(resolve(projectRoot, filename), resolve(packageRoot, filename));
}

function copyFile(src, dst) {
  if (fs.existsSync(src)) {
    console.log('Write to', dst);
    fs.copyFileSync(src, dst);
  }
}
