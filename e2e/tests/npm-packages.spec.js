import {execFileSync} from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {expect, test} from '@playwright/test';

// the directories that `pnpm publishNpmPkg` hands over to `npm publish`

const packagesDir = new URL('../../packages/', import.meta.url);

const readJson = (/** @type {URL} */ url) => JSON.parse(readFileSync(url, 'utf8'));

const PACKAGES = ['offscreen-display', 'rainbow-line'];

/** @typedef {string | {[condition: string]: ExportsField} | null | undefined} ExportsField */

/**
 * @param {ExportsField} exportsField the `exports` of a package.json, with conditions nested at will
 * @returns {string[]} all file targets
 */
function exportTargets(exportsField) {
  if (typeof exportsField === 'string') return [exportsField];
  return Object.values(exportsField ?? {}).flatMap(exportTargets);
}

for (const name of PACKAGES) {
  test.describe(`${name}/.npm-pkg`, () => {
    const sourceDir = new URL(`${name}/`, packagesDir);
    const packageDir = new URL(`${name}/.npm-pkg/`, packagesDir);

    test('has a publishable package.json', () => {
      const source = readJson(new URL('package.json', sourceDir));
      const pkg = readJson(new URL('package.json', packageDir));

      expect(pkg.name).toBe(source.name);
      expect(pkg.version).toBe(source.version);
      expect(pkg).not.toHaveProperty('scripts');
      expect(pkg).not.toHaveProperty('devDependencies');
      for (const version of Object.values({...pkg.dependencies, ...pkg.peerDependencies})) {
        expect(version).not.toMatch(/^workspace:/);
      }
      expect(pkg.repository).toEqual({
        type: 'git',
        url: 'git+https://github.com/spearwolf/visual-fx-web-components.git',
        directory: `packages/${name}`,
      });
    });

    test('contains every file its package.json refers to', () => {
      const pkg = readJson(new URL('package.json', packageDir));
      const targets = [pkg.main, pkg.module, ...exportTargets(pkg.exports)].filter(Boolean);

      expect(targets.length).toBeGreaterThan(0);
      for (const target of targets) {
        expect(existsSync(new URL(target, packageDir)), `${target} exists`).toBe(true);
      }
      expect(existsSync(new URL('LICENSE', packageDir))).toBe(true);
      expect(existsSync(new URL('README.md', packageDir))).toBe(true);
      expect(existsSync(new URL('CHANGELOG.md', packageDir))).toBe(true);
    });
  });
}

test('rainbow-line declares eventize and offscreen-display as optional peer dependencies', () => {
  const offscreenDisplay = readJson(new URL('offscreen-display/package.json', packagesDir));
  const source = readJson(new URL('rainbow-line/package.json', packagesDir));
  const rainbowLine = readJson(new URL('rainbow-line/.npm-pkg/package.json', packagesDir));

  expect(rainbowLine).not.toHaveProperty('dependencies');
  expect(rainbowLine.peerDependencies).toEqual({
    '@spearwolf/eventize': source.peerDependencies['@spearwolf/eventize'],
    '@spearwolf/offscreen-display': `^${offscreenDisplay.version.replace(/-dev$/, '')}`,
  });
  expect(rainbowLine.peerDependenciesMeta).toEqual({
    '@spearwolf/eventize': {optional: true},
    '@spearwolf/offscreen-display': {optional: true},
  });
});

test('the published source modules of rainbow-line only import published files', () => {
  const packageDir = new URL('rainbow-line/.npm-pkg/', packagesDir);
  const pkg = readJson(new URL('package.json', packageDir));
  const sources = exportTargets(pkg.exports).filter((target) => target.startsWith('./src/'));

  expect(sources.length).toBeGreaterThan(0);
  for (const source of sources) {
    const url = new URL(source, packageDir);
    const code = readFileSync(url, 'utf8');
    for (const [, specifier] of code.matchAll(/\bfrom\s+'(\.{1,2}\/[^']+)'/g)) {
      expect(existsSync(new URL(specifier, url)), `${specifier} imported by ${source} exists`).toBe(true);
    }
  }
});

test('the rainbow-line bundle carries a license banner with its version', () => {
  const {version} = readJson(new URL('rainbow-line/package.json', packagesDir));
  const bundle = readFileSync(new URL('rainbow-line/.npm-pkg/bundle.js', packagesDir), 'utf8');

  expect(bundle).toMatch(
    new RegExp(
      `^/\\*!\\n@file rainbow-line - .+\\n@author .+\\n@version ${version.replaceAll('.', '\\.')}\\+vanilla\\.\\d{8}\\n`,
    ),
  );
  expect(bundle).toContain('Licensed under the Apache License, Version 2.0');
});

test('astro-rainbow-line vendors the rainbow-line bundle of the current rainbow-line version', () => {
  const {version} = readJson(new URL('rainbow-line/package.json', packagesDir));
  const astroDir = new URL('astro-rainbow-line/', packagesDir);
  const vendoredFile = `rainbow-line-v${version}.js`;

  expect(readdirSync(astroDir).filter((name) => /^rainbow-line-v.+\.js$/.test(name))).toEqual([vendoredFile]);

  const bundle = readFileSync(new URL(vendoredFile, astroDir), 'utf8');
  expect(bundle).toMatch(
    new RegExp(
      `^/\\*!\\n@file rainbow-line - .+\\n@author .+\\n@version ${version.replaceAll('.', '\\.')}\\+vanilla\\.\\d{8}\\n`,
    ),
  );

  expect(readFileSync(new URL('RainbowLine.astro', astroDir), 'utf8')).toContain(`'js/${vendoredFile}'`);

  const readme = readFileSync(new URL('README.md', astroDir), 'utf8');
  expect(readme).toContain(vendoredFile);
  expect(new Set(readme.match(/rainbow-line-v\d+\.\d+\.\d+/g))).toEqual(new Set([`rainbow-line-v${version}`]));
});

test('the published type declarations serve a typescript consumer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'visual-fx-types-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({type: 'module'}));
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          module: 'nodenext',
          moduleResolution: 'nodenext',
          target: 'es2023',
          lib: ['es2023', 'dom', 'dom.iterable'],
          types: [],
          // the published declarations are what is checked here
          skipLibCheck: false,
          // keeps the resolution inside the node_modules of the consumer, as after a real npm install; otherwise the
          // imports of the rainbow-line declarations resolve through packages/rainbow-line/node_modules and see a
          // second OffscreenDisplay class
          preserveSymlinks: true,
          noEmit: true,
        },
        include: ['consumer.ts'],
      }),
    );
    copyFileSync(fileURLToPath(new URL('../types/consumer.ts', import.meta.url)), join(dir, 'consumer.ts'));

    const link = (/** @type {string} */ name, /** @type {string} */ target) => {
      const path = join(dir, 'node_modules', name);
      mkdirSync(dirname(path), {recursive: true});
      symlinkSync(target, path, 'dir');
    };
    link('@spearwolf/offscreen-display', fileURLToPath(new URL('offscreen-display/.npm-pkg', packagesDir)));
    link('rainbow-line', fileURLToPath(new URL('rainbow-line/.npm-pkg', packagesDir)));
    link('@spearwolf/eventize', realpathSync(new URL('offscreen-display/node_modules/@spearwolf/eventize', packagesDir)));

    const require = createRequire(import.meta.url);
    const typescriptPackageJson = require.resolve('typescript/package.json');
    const tscPath = join(dirname(typescriptPackageJson), readJson(pathToFileURL(typescriptPackageJson)).bin.tsc);

    let errors = '';
    try {
      execFileSync(process.execPath, [tscPath, '-p', dir], {encoding: 'utf8'});
    } catch (error) {
      errors = `${error.stdout ?? ''}${error.stderr ?? ''}` || String(error);
    }
    expect(errors, 'tsc reports no errors').toBe('');
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
