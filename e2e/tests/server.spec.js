import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect, test} from '@playwright/test';
import {resolveFile} from '../resolveFile.mjs';

test('resolveFile() stays inside the directory of a route, also next to a neighbour with the same name prefix', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'e2e-resolve-file-'));
  try {
    mkdirSync(join(tmp, 'root'));
    writeFileSync(join(tmp, 'root', 'page.html'), '');
    mkdirSync(join(tmp, 'root-neighbour'));
    writeFileSync(join(tmp, 'root-neighbour', 'secret.txt'), '');
    const routes = {'/r/': join(tmp, 'root')};

    expect(resolveFile(routes, '/r/page.html')).toBe(join(tmp, 'root', 'page.html'));
    expect(resolveFile(routes, '/r/../root-neighbour/secret.txt')).toBeUndefined();
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
});

test('the server answers a malformed escape with 400 and keeps running', async ({request}) => {
  expect((await request.get('/pages/%E0%A4%A')).status()).toBe(400);
  expect((await request.get('/pages/bundle.html')).ok()).toBe(true);
});
