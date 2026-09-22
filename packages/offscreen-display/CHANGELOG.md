# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `OffscreenDisplay#dispose()` terminates the worker and stops observing the canvas
- `OffscreenWorkerDisplay#destroy()` ends the frame loop and releases all listeners, retained events, signals and effects of the display
- `OffscreenWorkerDisplay#pixelRatio`: the ratio of the canvas pixels to css pixels

### Changed

- an element removed from the document terminates its worker one animation frame later; connecting it again afterwards starts a fresh worker with a fresh canvas
- the canvas size comes from a `ResizeObserver`; the main thread runs no animation frame loop of its own
- **breaking** for subclasses that assume css pixels: `{resize}` and with it `canvasWidth`/`canvasHeight` are physical pixels
- `onResize` also fires when only the `pixelRatio` changes
- `onFrame` starts with the first size from the main thread

### Fixed

- the worker kept running after its element was removed from the document
- an `onFrame` listener that threw ended the animation
- `OffscreenWorkerDisplay` ignored the `{isConnected: false}` message, so the worker kept rendering frames after the element was disconnected

### Changed

- published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); `package.json` names the source `repository`

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
