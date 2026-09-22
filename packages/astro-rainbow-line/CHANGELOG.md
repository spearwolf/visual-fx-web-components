# Changelog for package [@spearwolf/astro-rainbow-line](https://github.com/spearwolf/visual-fx-web-components/tree/main/packages/astro-rainbow-line)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `astro` (`>=5`) is a peer dependency
- published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); `package.json` names the source `repository`
- the `<script>` tag that loads rainbow-line is rendered once per page, however many `<RainbowLine>` the page contains

### Fixed

- without a `BASE_URL` the path of the script starts at `/`

## [1.3.0] - 2024-12-12

### Changed

- update `rainbow-line` web component to `0.4.0`
