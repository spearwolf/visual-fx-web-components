# Changelog for package [rainbow-line](https://github.com/spearwolf/visual-fx-web-components/tree/main/packages/rainbow-line)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

...

## [0.4.0] - 2024-12-12

### Changed

- upgrade dependencies
  - `@spearwolf/eventize` to `^4.x`
  - `@spearwolf/offscreen-display` to `^0.3.0`

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

- [unreleased](https://github.com/spearwolf/visual-fx-web-components/compare/rainbow-line-v0.2.1...HEAD)
- [0.3.0](https://github.com/spearwolf/visual-fx-web-components/compare/rainbow-line-v0.2.1...rainbow-line-v0.3.0)
- [0.2.1](https://github.com/spearwolf/visual-fx-web-components/compare/rainbow-line-v0.2.0...rainbow-line-v0.2.1)
