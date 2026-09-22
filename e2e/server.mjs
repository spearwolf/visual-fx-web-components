import {createReadStream} from 'node:fs';
import {createServer} from 'node:http';
import {extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveFile} from './resolveFile.mjs';

// A deliberately dumb static file server: no transforms, no bundling, no module resolution.
// Whatever the packages publish is served exactly as it is, like from a CDN.

const e2eDir = fileURLToPath(new URL('.', import.meta.url));
const packagesDir = resolve(e2eDir, '../packages');

const PORT = Number(process.env.E2E_PORT ?? 4180);

const ROUTES = {
  '/pages/': join(e2eDir, 'pages'),
  '/astro/': join(e2eDir, 'dist/astro'),
  '/pkg/rainbow-line/': join(packagesDir, 'rainbow-line/.npm-pkg'),
  '/pkg/offscreen-display/': join(packagesDir, 'offscreen-display/.npm-pkg'),
};

/** @type {Record<string, string>} */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    // a malformed escape such as %E0%A4%A throws a URIError, which would end the whole server
    res.writeHead(400).end('bad request');
    return;
  }
  const file = resolveFile(ROUTES, urlPath);
  if (!file) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {'content-type': MIME_TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store'});
  createReadStream(file)
    .on('error', () => res.destroy())
    .pipe(res);
}).listen(PORT, () => {
  console.log(`e2e server listening on http://localhost:${PORT}/`);
});
