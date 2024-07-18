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

... to install or refresh all the dependencies. After that you can simply build and test all packages with ..

```sh
$ pnpm cbt  # => clean build test
```

> 🔎 This project does not currently use a separate issue tracking system; instead, TODO, FIXME, and XXX issues are written directly as comments in the source code, without any further indirection.
> An overview of open issues can be found in [TODO.md](TODO.md).

## 📖 Content

| package | description |
|-|-|
| [`offscreen-display`](packages/offscreen-display/) | Helpers for creating custom offscreen canvas elements |
| [`rainbow-line`](packages/rainbow-line/) | A custom element that displays a cut line animated with rainbow colors |

‼️ [for those interested in the shadow-ents-* packages, we are happy to announce that they have now been relocated to their own dedicated monorepo, "shadow-objects"](https://github.com/spearwolf/shadow-objects)

---

<figure>

![spearwolf](spearwolf.svg)

<figcaption><small>Thank you and have a nice day 😄</small></figcaption>
</figure>
