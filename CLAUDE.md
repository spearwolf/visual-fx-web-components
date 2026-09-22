# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

pnpm + nx monorepo of custom HTML elements (web components) for visual effects. Self-described as a "code sketchbook": some packages are stable, others experimental. All source is plain ES-module JavaScript (no TypeScript in the packages, no transpile step beyond esbuild bundling).

## Commands

Run from the repo root (Node >= 20.12, pnpm 9):

```sh
pnpm install
pnpm cbt                         # clean + build + test (all projects)
pnpm build | pnpm lint | pnpm test
pnpm ci                          # what GitHub Actions runs: build, lint, test
pnpm nx build rainbow-line       # single project (nx project names are unscoped: offscreen-display, rainbow-line, astro-rainbow-line)
pnpm nx lint offscreen-display
pnpm nx dev rainbow-line         # vite dev server on packages/rainbow-line/index.html
pnpm make:todo                   # regenerate TODO.md from TODO/FIXME/XXX comments
```

There are no real tests yet: `offscreen-display`'s `test` script is an `echo` placeholder.

Linting is ESLint (root `.eslintrc.json`) with Prettier enforced as an ESLint error: 130 cols, single quotes, trailing commas, no bracket spacing. `eslint-plugin-require-extensions` requires explicit `.js` extensions on relative imports.

## Architecture

The core idea is **rendering a canvas inside a Web Worker via `OffscreenCanvas`**, split across two packages:

- **`packages/offscreen-display`** (`@spearwolf/offscreen-display`) — the reusable base, two entry points:
  - `OffscreenDisplay` (main thread, `src/lib/main/`): an `HTMLElement` base class with a shadow root containing a `<canvas>`. On `connectedCallback` it calls `transferControlToOffscreen()`, creates the worker via the subclass hook `createWorker()`, and posts `{canvas, contextAttributes, ...getInitialWorkerAttributes()}`. A rAF loop watches the canvas client rect and posts `{resize}`; connect/disconnect post `{isConnected}`. Subclasses override `createWorker()` (required), `getContextAttributes()`, `getInitialWorkerAttributes()`, and optionally pass their own initial shadow HTML to the constructor.
  - `OffscreenWorkerDisplay` (worker side, exported as `@spearwolf/offscreen-display/worker.js`): consumes those messages via `parseMessageData(data)`, holds state in `@spearwolf/signalize` signals, and emits `@spearwolf/eventize` events `onCanvas`, `onInit`, `onResize` (all retained, so late listeners still receive them) and `onFrame` (per rAF, only when connected and canvas size > 0). `now` is in seconds.
  - Build: `scripts/build.mjs` (esbuild) → `dist/offscreen-display.js` and `dist/offscreen-display-worker.js`, with eventize/signalize kept external.

- **`packages/rainbow-line`** — the `<rainbow-line>` element built on the above. `RainbowLineElement` (main) maps HTML attributes to worker messages (`attributeChangedCallback` → `postMessage`); `RainbowLineWorkerDisplay.js` does the 2D-canvas drawing in `onFrame`; `rainbow-line.worker.js` is the worker entry. Build outputs land in the **package root**, not `dist/`:
  - `rainbow-line.js` + `rainbow-line.worker.js` — element loads the worker as a separate file via `new URL(..., import.meta.url)`.
  - `bundle.js` — the default export; `src/bundle.js` subclasses the element and inlines the worker with `esbuild-plugin-inline-worker`, so it is a single self-contained file.
  - Depends on `@spearwolf/offscreen-display` via `workspace:*`, so nx builds offscreen-display first.

- **`packages/astro-rainbow-line`** (`@spearwolf/astro-rainbow-line`) — a single `RainbowLine.astro` component that renders `<rainbow-line>` elements and loads the script from `${BASE_URL}/js/rainbow-line-vX.Y.Z.js` (overridable via `RAINBOW_LINE_JS`). The consumer must host that file; a copy of the built rainbow-line bundle is committed here as `rainbow-line-v<version>.js`. When bumping rainbow-line, update that vendored file, the default path in `RainbowLine.astro`, and the README.

## Release / publishing

Publishing happens automatically in CI on push to `main` (`pnpm publishNpmPkg`), so **bumping `version` in a package's `package.json` is effectively a release**. `scripts/publishNpmPkg.mjs` skips versions already on npm and versions ending in `-dev`.

For `offscreen-display` and `rainbow-line`, `buildNpmPkg` assembles a separate `.npm-pkg/` directory: the package's `scripts/buildPackage.mjs` copies the built files, then `scripts/makePackageJson.mjs` writes the published `package.json` — stripping the `.npm-pkg/` path prefix, resolving `workspace:*` deps to `^<version>` of the sibling package, and applying `package.override.json` (a `null` value deletes the key, used to drop `scripts`/`devDependencies`). `astro-rainbow-line` publishes its directory as-is.

esbuild outputs get a license banner from `scripts/makeBanner.mjs` containing the package version plus a build tag and date.

Each package keeps a `CHANGELOG.md` in Keep-a-Changelog format; update it together with version bumps.
