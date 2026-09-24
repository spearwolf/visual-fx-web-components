# rainbow-line

![npm (scoped)](https://img.shields.io/npm/v/rainbow-line) [![License](https://img.shields.io/badge/License-Apache_2.0-yellowgreen.svg)](https://opensource.org/licenses/Apache-2.0)

A custom element that displays a cut line animated with rainbow colors ..

```html
<rainbow-line
  color-slice-width="10"
  slice-cycle-time="7"
  cycle-direction="left"
></rainbow-line>

<script type="module" src="https://www.unpkg.com/rainbow-line@latest"></script>
```

## Usage with npm

```sh
➜ npm i rainbow-line
```

```javascript
import 'rainbow-line';
```

The default export `bundle.js` is a single file with the worker embedded, it defines the `<rainbow-line>` element.

The line pauses its animation while it is hidden (`display: none` on it or an ancestor) or more than 200px outside the viewport, and resumes when it comes back.

`rainbow-line/rainbow-line.js` defines the element as well, but loads its worker from `rainbow-line.worker.js` in the same directory: ship both files together.

### Source modules for bundlers

The subpaths `rainbow-line/RainbowLineElement.js` and `rainbow-line/RainbowLineWorkerDisplay.js` are the unbundled sources, with type declarations. They import `@spearwolf/offscreen-display` and `@spearwolf/eventize`, which are optional peer dependencies of this package, so install them next to it:

```sh
➜ npm i rainbow-line @spearwolf/offscreen-display @spearwolf/eventize
```

`RainbowLineElement` does not register itself:

```javascript
import {RainbowLineElement} from 'rainbow-line/RainbowLineElement.js';

customElements.define('rainbow-line', RainbowLineElement);
```

Its `createWorker()` starts the worker source `src/rainbow-line.worker.js` of the package through `src/startWorker.js`, with `new Worker(new URL('./rainbow-line.worker.js', import.meta.url), {type: 'module'})`, the pattern bundlers such as Vite and webpack recognise and bundle as a worker. A worker of your own overrides `createWorker()` and hands every message it receives to `parseMessageData()` from `rainbow-line/RainbowLineWorkerDisplay.js`, as `src/rainbow-line.worker.js` does.

## Attributes

| Attribute | Default | Values |
| --- | --- | --- |
| `color-slice-width` | `10` | Width of a color slice in css pixels. A value between `0` and `1` is a fraction of the element width (`0.25` makes four slices). Slices are at least one device pixel wide. |
| `slice-cycle-time` | `7` | Seconds for the colors to cycle once through a slice. |
| `cycle-direction` | `right` | `left` or `right`; any other value is `right`. |
| `cycle-colors` | — (rainbow) | A list of css colors, separated by whitespace or commas: `#023 #fa3`, `red, blue`, `rgb(255 0 0) hsl(200 80% 50%)`. Invalid colors are skipped with a warning in the console; without a single valid color the line shows the rainbow. |
| `cycle-colors-repeat` | `1` | How often the `cycle-colors` repeat across the width. A value below `1` counts as its reciprocal: `0.5` repeats them twice, `0.01` a hundred times. The colors repeat at most once per device pixel. Has no effect on the rainbow. |

Numeric attributes that are missing, not a number, or not above `0` use their default. Every attribute can be changed while the element is on the page.

![rainbow-line elements preview](preview.png)

see [example.html](example.html) for more usage examples

live preview at &rarr; [jsfiddle.net/spearwolf/spjbqnxd/](https://jsfiddle.net/spearwolf/spjbqnxd/)


## Copyright and License

Copyright &copy; 2024 by [Wolfger Schramm](mailto:wolfger@spearwolf.de?subject=[GitHub]%20rainbow-line).

The source code and npm package is licensed under the [Apache-2.0 License](./LICENSE).


<small>have fun!</small>
🚀🌱
