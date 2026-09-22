import {createReadStream, statSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname, join, normalize, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

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

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function resolveFile(urlPath) {
  for (const [prefix, dir] of Object.entries(ROUTES)) {
    if (urlPath.startsWith(prefix)) {
      const file = normalize(join(dir, urlPath.slice(prefix.length)));
      if (!file.startsWith(dir)) return undefined;
      try {
        const stat = statSync(file);
        return stat.isDirectory() ? join(file, 'index.html') : file;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

createServer((req, res) => {
  const file = resolveFile(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
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
