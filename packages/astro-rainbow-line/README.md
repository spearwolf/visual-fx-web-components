# @spearwolf/astro-rainbow-line

An astro wrapper for the [rainbow-line web component](https://github.com/spearwolf/visual-fx-web-components/tree/main/packages/rainbow-line).

## Usage

```astro
---
import RainbowLine from '@spearwolf/astro-rainbow-line';
---

<RainbowLine />
<RainbowLine shadow cycleColors={['#023', '#fa3']} cycleColorsRepeat={2} />
```

## Props

| Prop | Default | Description |
| --- | --- | --- |
| `shadow` | `false` | Draws a second, blurred line below the first one. |
| `colorSliceWidth` | `10` | Width of a color slice. |
| `sliceCycleTime` | `7` | Seconds for the colors to cycle once through a slice. |
| `cycleDirection` | `'right'` | `'right'` or `'left'`. |
| `cycleColors` | — (rainbow) | A string or an array of css colors. |
| `cycleColorsRepeat` | — (`1`) | How often the `cycleColors` repeat across the width. |

The props become the attributes of the `<rainbow-line>` element; the value ranges are described in the [attributes of rainbow-line](https://github.com/spearwolf/visual-fx-web-components/tree/main/packages/rainbow-line#attributes).

## CSS custom properties

| Property | Default |
| --- | --- |
| `--rainbow-line-height` | `4px` |
| `--rainbow-shadow-height` | `12px` |
| `--rainbow-shadow-opacity` | `0.4` |

## The rainbow-line script

The component does not bundle the web component, it loads it with a `<script>` tag. Your site has to host [rainbow-line-v0.5.0.js](./rainbow-line-v0.5.0.js) from this package as `js/rainbow-line-v0.5.0.js` below its `BASE_URL`, for example in `public/js/`.

The environment variable `RAINBOW_LINE_JS` (in your `.env` file) sets a different path below `BASE_URL`.

The `<script>` tag is rendered once per page, however many `<RainbowLine>` the page contains.

## CHANGELOG

See [CHANGELOG.md](CHANGELOG.md).
