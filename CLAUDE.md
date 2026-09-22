# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

pnpm + nx monorepo of custom HTML elements (web components) for visual effects. Self-described as a "code sketchbook": some packages are stable, others experimental. All source is plain ES-module JavaScript (no TypeScript in the packages, no transpile step beyond esbuild bundling).

## Commands

Run from the repo root (Node >= 24.15, pnpm 11, nx 23):

```sh
pnpm install
pnpm playwright:install          # once: chromium, firefox and webkit (vitest uses chromium, e2e all three)
pnpm cbt                         # clean + build + test + e2e (all projects)
pnpm build | pnpm test | pnpm e2e
pnpm lint | pnpm format          # biome check / biome check --write (whole repo, not an nx target)
pnpm typecheck                   # tsc (TypeScript 7) with checkJs and noImplicitAny over sources, scripts and e2e
pnpm verify                      # what GitHub Actions runs: lint, typecheck, build, test, e2e
pnpm nx build rainbow-line       # single project (nx project names are unscoped: offscreen-display, rainbow-line, astro-rainbow-line, e2e)
pnpm nx test offscreen-display
pnpm nx dev rainbow-line         # vite dev server on packages/rainbow-line/index.html
pnpm make:todo                   # collect TODO/FIXME/XXX comments into a local, gitignored TODO.md
pnpm deps:update                 # interactive dependency update via npm-check (also in the packages)
```

Script names must not collide with pnpm built-in commands (`pnpm help` lists them): for most of them, such as `ci` (a frozen clean install) or `update`, `pnpm <name>` runs the built-in and silently ignores the script. That is why the CI script is `verify` and the npm-check script is `deps:update`.

Formatting and linting is Biome (`biome.json`): 130 cols, single quotes, trailing commas, no bracket spacing; `useImportExtensions` requires explicit `.js` extensions on relative imports. `.astro` files are checked too (full HTML support); `noTsIgnore` is off for them, because `@ts-expect-error` would break in consumer projects that have Astro's types. The generated `audit.html` is excluded.

`tsconfig.json` is only for `pnpm typecheck` (no emit, `noImplicitAny` on, `strict` off). It maps `@spearwolf/offscreen-display` to its `src/`, so the check never sees build output. Test files are not type checked, since they import build output. Each of `offscreen-display` and `rainbow-line` has a `tsconfig.build.json` that extends it: its `build` script runs `tsc -p tsconfig.build.json` after esbuild and writes the type declarations from the JSDoc to `dist/types/` (rainbow-line only for the source subpaths `./RainbowLineElement.js` and `./RainbowLineWorkerDisplay.js`, and with `paths` cleared, so it sees offscreen-display through its built package like a consumer). The `types` conditions in `exports` point there; the JSDoc of the public surface is what the declarations carry.

## Tests

Every test runs against build output, not sources: nx `test` depends on `build`, `e2e` on `^buildNpmPkg`.

- **Package tests** (`packages/*/test/`, `pnpm nx test <project>`): Vitest 5. `offscreen-display` and `rainbow-line` use browser mode in headless chromium via `@vitest/browser-playwright` (shared config in `vitest.shared.mjs`). A canvas transferred to a worker cannot be read back from the main thread, so pixel assertions screenshot the element and analyse one row with the helpers in `testing/pixels.js`. `astro-rainbow-line` renders the component with Astro's container API in node.
- **e2e** (`e2e/`, nx project `e2e`, `pnpm e2e`): Playwright against `e2e/server.mjs`, a plain static server without transforms. It serves the `.npm-pkg/` directories of the packages, static fixture pages (`e2e/pages/`) and a small Astro site (`e2e/src/`, built by the `e2e:build` target) that uses `<RainbowLine>` and hosts the vendored rainbow-line script. `npm-packages.spec.js` checks the publishable `package.json` files and that every `exports` target exists; it also type-checks `e2e/types/consumer.ts` with `strict` settings in a temporary consumer project linked to the `.npm-pkg/` directories, and checks that `astro-rainbow-line` vendors exactly the bundle of the current rainbow-line version (file, banner, default path, README). Playwright runs in chromium, firefox and webkit; `E2E_SKIP_WEBKIT=1` leaves webkit out locally (its Linux build needs ICU 74 and flite, which Arch-based systems do not have), CI always runs all three.

pnpm 11 reads its settings from `pnpm-workspace.yaml` (not `.npmrc`); dependencies that need install scripts must be listed under `allowBuilds` there. There is no project `.npmrc`: in CI, `actions/setup-node` (with `registry-url`) writes the npm auth from the `NPM_AUTH_TOKEN` secret, passed as `NODE_AUTH_TOKEN`.

## Architecture

The core idea is **rendering a canvas inside a Web Worker via `OffscreenCanvas`**, split across two packages:

- **`packages/offscreen-display`** (`@spearwolf/offscreen-display`) — the reusable base, two entry points:
  - `OffscreenDisplay` (main thread, `src/lib/main/`): an `HTMLElement` base class with a shadow root containing a `<canvas>`. On `connectedCallback` it calls `transferControlToOffscreen()`, creates the worker via the subclass hook `createWorker()`, and posts `{canvas, contextAttributes, ...getInitialWorkerAttributes()}`. A `ResizeObserver` on the canvas (`device-pixel-content-box`, otherwise the content box × `devicePixelRatio`) posts `{resize: {width, height, pixelRatio}}` in physical pixels; connect/disconnect post `{isConnected}`. One animation frame after it was disconnected the element terminates its worker (`dispose()`), a later reconnect starts a fresh worker with a fresh canvas. Subclasses override `createWorker()` (required), `getContextAttributes()`, `getInitialWorkerAttributes()`, and optionally pass their own initial shadow HTML to the constructor.
  - `OffscreenWorkerDisplay` (worker side, exported as `@spearwolf/offscreen-display/worker.js`): consumes those messages via `parseMessageData(data)`, holds state in `@spearwolf/signalize` signals, and emits `@spearwolf/eventize` events `onCanvas`, `onInit`, `onResize` (all retained, so late listeners still receive them) and `onFrame` (per rAF, only when connected, after the first size and when the canvas size is > 0). `canvasWidth`/`canvasHeight` are physical pixels, `pixelRatio` is their ratio to css pixels, `now` is in seconds. A throwing listener does not end the frame loop; `destroy()` ends it and releases listeners, signals and effects.
  - Build: `scripts/build.mjs` (esbuild) → `dist/offscreen-display.js` and `dist/offscreen-display-worker.js`, with eventize/signalize kept external; then the type declarations → `dist/types/`.

- **`packages/rainbow-line`** — the `<rainbow-line>` element built on the above. `RainbowLineElement` (main) maps HTML attributes to worker messages (`attributeChangedCallback` → `postMessage`); `RainbowLineWorkerDisplay.js` does the 2D-canvas drawing in `onFrame`; `rainbow-line.worker.js` is the worker entry. Build outputs land in the **package root**, not `dist/`:
  - `rainbow-line.js` + `rainbow-line.worker.js` — element loads the worker as a separate file via `new URL(..., import.meta.url)`.
  - `bundle.js` — the default export; `src/bundle.js` subclasses the element and inlines the worker via `scripts/esbuildInlineWorkerPlugin.mjs` (a `*.worker.js` import becomes a factory for a classic blob-url worker, bundled as iife with the same targets), so it is a single self-contained file.
  - The type declarations of the source subpaths go to `dist/types/`, the only build output in `dist/`.
  - Takes `@spearwolf/offscreen-display` (`workspace:*`) and `@spearwolf/eventize` as devDependencies and as optional peerDependencies: the built files inline both, only the source subpaths `./RainbowLineElement.js` and `./RainbowLineWorkerDisplay.js` import them. nx builds and publishes offscreen-display first.

- **`packages/astro-rainbow-line`** (`@spearwolf/astro-rainbow-line`) — a single `RainbowLine.astro` component that renders `<rainbow-line>` elements and loads the script from `js/rainbow-line-vX.Y.Z.js` below `BASE_URL` (overridable via `RAINBOW_LINE_JS`). The consumer must host that file; a copy of the built rainbow-line bundle is committed here as `rainbow-line-v<version>.js`. When bumping rainbow-line, update that vendored file, the default path in `RainbowLine.astro`, and the README; `npm-packages.spec.js` fails until all three match the rainbow-line version. `astro` (`>=5`) is a peerDependency.

## Release / publishing

Publishing happens automatically in CI on push to `main` (`pnpm publishNpmPkg`), so **bumping `version` in a package's `package.json` is effectively a release**. `scripts/publishNpmPkg.mjs` skips versions already on npm and versions ending in `-dev`.

nx publishes a package only after the workspace packages it depends on (`^publishNpmPkg`), so `offscreen-display` goes out before `rainbow-line` and a failed publish stops its dependents. The workflow runs the checks on pull requests as well, but publishes only on push to `main`, one run at a time (`concurrency: publish`) and with npm provenance (`NPM_CONFIG_PROVENANCE`, which needs the `repository` field in each package's `package.json`).

For `offscreen-display` and `rainbow-line`, `buildNpmPkg` assembles a separate `.npm-pkg/` directory that holds exactly what `npm publish` receives: the package's `scripts/buildPackage.mjs` copies the built files and `dist/types/` (and fails without them), then `scripts/makePackageJson.mjs` writes the published `package.json` — resolving `workspace:*` in `dependencies` and `peerDependencies` to `^<version>` of the sibling package and applying `package.override.json` (a `null` value deletes the key, used to drop `scripts`/`devDependencies`). `astro-rainbow-line` publishes its directory as-is.

esbuild outputs get a license banner from `scripts/makeBanner.mjs` containing the package version plus a build tag and date.

Each package keeps a `CHANGELOG.md` in Keep-a-Changelog format; update it together with version bumps.
