import {existsSync, readFileSync} from 'node:fs';
import {expect, test} from '@playwright/test';

// the directories that `pnpm publishNpmPkg` hands over to `npm publish`

const packagesDir = new URL('../../packages/', import.meta.url);

const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));

const PACKAGES = ['offscreen-display', 'rainbow-line'];

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
