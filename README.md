# visual-fx-web-components 👀

> Home of a variety of _custom HTML elements_ and _npm packages_ to create visually spectacular websites :boom:
> 
> ‼️ But dear user, be warned: while some packages are stable and usable, other things here are highly experimental. this is more of an active **code sketchbook** than a polished end product

🚀🌱

## ⚙️ Local Dev Setup

This is a monorepo based on [nx](https://nx.dev/) and [pnpm](https://pnpm.io/).

Just use ...

```sh
$ pnpm install
```

... to install or refresh all the dependencies. The tests run in a headless chromium, which has to be installed once with ..

```sh
$ pnpm playwright:install
```

After that you can simply build and test all packages with ..

```sh
$ pnpm cbt  # => clean build test e2e
```

| command | what it does |
|-|-|
| `pnpm lint` / `pnpm format` | check / fix formatting and lint rules with [biome](https://biomejs.dev/) |
| `pnpm typecheck` | type check the javascript sources with typescript |
| `pnpm test` | blackbox tests of every package against its build output ([vitest](https://vitest.dev/) browser mode) |
| `pnpm e2e` | the published packages used together, like a consumer would ([playwright](https://playwright.dev/)) |
| `pnpm ci` | all of the above, as in the github workflow |

> 🔎 This project does not currently use a separate issue tracking system; instead, TODO, FIXME, and XXX issues are written directly as comments in the source code, without any further indirection.
> An overview of open issues can be found in [TODO.md](TODO.md).

## 📖 Content

| package | description |
|-|-|
| [`offscreen-display`](packages/offscreen-display/) | helpers for creating custom offscreen canvas elements |
| [`rainbow-line`](packages/rainbow-line/) | a web component that displays a cut line animated with rainbow colors |
| [`@spearwolf/astro-rainbow-line`](packages/astro-rainbow-line/) | astro wrapper for the rainbow-line web component |


---

<figure>

![spearwolf](spearwolf.svg)

<figcaption><small>Thank you and have a nice day 😄</small></figcaption>
</figure>
