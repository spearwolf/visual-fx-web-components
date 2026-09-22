# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-09-22

### Added

- type declarations for both entry points (`dist/types/`), referenced by `types` in `exports`; `OffscreenWorkerDisplayEvents` describes the listener arguments of the events, `OffscreenDisplayMessage` the messages from the main thread
- `OffscreenDisplay#dispose()` terminates the worker and stops observing the canvas
- `OffscreenWorkerDisplay#destroy()` ends the frame loop and releases all listeners, retained events, signals and effects of the display
- `OffscreenWorkerDisplay#pixelRatio`: the ratio of the canvas pixels to css pixels

### Changed

- **breaking**: depends on `@spearwolf/eventize` 6 and `@spearwolf/signalize` 1 — a worker adds its listeners with `on(display, {...})` from the same `@spearwolf/eventize` 6; two eventize majors on one display throw
- `OffscreenWorkerDisplay#ready` is always a boolean
- an element removed from the document terminates its worker one animation frame later; connecting it again afterwards starts a fresh worker with a fresh canvas
- the canvas size comes from a `ResizeObserver`; the main thread runs no animation frame loop of its own
- **breaking** for subclasses that assume css pixels: `{resize}` and with it `canvasWidth`/`canvasHeight` are physical pixels
- `onResize` also fires when only the `pixelRatio` changes
- `onFrame` starts with the first size from the main thread
- published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); `package.json` names the source `repository`
- the README documents the lifecycle, the events, the messages and the TypeScript usage

### Fixed

- the worker kept running after its element was removed from the document
- an `onFrame` listener that threw ended the animation
- `OffscreenWorkerDisplay` ignored the `{isConnected: false}` message, so the worker kept rendering frames after the element was disconnected
- `OffscreenWorkerDisplay#parseMessageData()` threw on message data that is not an object, such as a number or a string; it ignores such data like `null`

## [0.2.0] - 2024-12-12

### Added

- introduce CHANGELOG.md ;)

### Changed

- upgrade dependencies
  - `@spearwolf/eventize` to `4.x`
  - `@spearwolf/signalize` to `0.18.x`


## [0.1.2] - 2024-02-27

### Added

- add JSDocs to `OffscreenDisplay` class

## Comparing changes

- [unreleased](https://github.com/spearwolf/visual-fx-web-components/compare/offscreen-display-v0.3.0...HEAD)
- [0.3.0](https://github.com/spearwolf/visual-fx-web-components/compare/offscreen-display-v0.2.0...offscreen-display-v0.3.0)
- [0.2.0](https://github.com/spearwolf/visual-fx-web-components/compare/offscreen-display-v0.1.2...offscreen-display-v0.2.0)
