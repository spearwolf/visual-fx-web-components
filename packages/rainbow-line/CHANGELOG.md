# Changelog for package [rainbow-line](https://github.com/spearwolf/visual-fx-web-components/tree/main/packages/rainbow-line)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-09-22

### Added

- type declarations for the source modules `./RainbowLineElement.js` and `./RainbowLineWorkerDisplay.js`

### Changed

- upgrade dependencies
  - `@spearwolf/eventize` to `^6.2.0`
  - `@spearwolf/offscreen-display` to `^0.3.0`
- `bundle.js`: the inlined worker is built for the same browser targets as the element (`chrome121`, `edge120`, `safari17`, `firefox122`)
- `@spearwolf/eventize` and `@spearwolf/offscreen-display` are optional peer dependencies: `bundle.js`, `rainbow-line.js` and `rainbow-line.worker.js` are self-contained, only the source subpaths `./RainbowLineElement.js` and `./RainbowLineWorkerDisplay.js` import them
- published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); `package.json` names the source `repository`
- every frame is drawn with two `drawImage` calls from a pre-rendered strip of colors, however narrow the slices are
- the README documents all attributes with their defaults and values
- the README shows how to use the package from npm, including the source modules for bundlers

### Fixed

- sharp on screens with a `devicePixelRatio` above 1: the canvas has physical pixels, `color-slice-width` stays in css pixels
- a removed element terminates its worker
- the `./rainbow-line.worker.js` subpath export pointed to a non-existent `rainbow-line-worker.js`
- a `color-slice-width`, `slice-cycle-time` or `cycle-colors-repeat` that is `0`, negative or not a number uses the default; slices are at least one device pixel wide, so every value keeps the line animating
- removing a numeric attribute sets it back to its default
- `cycle-colors` accepts colors separated by commas, tabs and line breaks; invalid colors are skipped with a console warning, and without any valid color the line shows the rainbow
- `cycle-colors-repeat` takes effect when it changes while the element is connected
- `RainbowLineElement` from the source subpath `./RainbowLineElement.js` loaded its worker from a `src/rainbow-line.worker.js` that was missing from the package
- `parseMessageData()` from `./RainbowLineWorkerDisplay.js` threw on `null`, `undefined` and other message data that is not an object; it ignores such data

## [0.4.0] - 2024-12-12

### Changed

- upgrade dependencies
  - `@spearwolf/eventize` to `^4.x`
  - `@spearwolf/offscreen-display` to `^0.2.0`

## [0.3.0] - 2024-09-11

### Added

- `color-slice-width` values are interpreted as a _percentage of the total width_ if the value is between `0` and `1`
- Add new options to use custom color gradients:
  - `cycle-colors`
  - `cycle-colors-repeat`
- Switch to [esm.sh](https://esm.sh/) as default CDN for `example.html`
- Add fiddle demo


### Changed

- The `index.html` now shows a range of usage examples

### Fixed

- Fix the _Comparing changes_ section so that it is readable within a markdown view


## [0.2.1] - 2024-05-12

### Added

- Create CHANGELOG.md ;)

### Fixed

- Fix broken npm package dependency to `@spearwolf/offscreen-display`


## Comparing changes

- [unreleased](https://github.com/spearwolf/visual-fx-web-components/compare/rainbow-line-v0.5.0...HEAD)
- [0.5.0](https://github.com/spearwolf/visual-fx-web-components/compare/rainbow-line-v0.4.0...rainbow-line-v0.5.0)
- [0.4.0](https://github.com/spearwolf/visual-fx-web-components/compare/rainbow-line-v0.3.0...rainbow-line-v0.4.0)
- [0.3.0](https://github.com/spearwolf/visual-fx-web-components/compare/rainbow-line-v0.2.1...rainbow-line-v0.3.0)
- [0.2.1](https://github.com/spearwolf/visual-fx-web-components/compare/rainbow-line-v0.2.0...rainbow-line-v0.2.1)
