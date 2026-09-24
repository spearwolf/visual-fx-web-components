# Backlog

Work that is understood and written down but not scheduled. One section per topic, each
self-contained: whoever picks one up should not need anything beyond the section and the code it
points at. A topic leaves this file when it is done; whatever outlives it (a design note, a known
limitation) moves next to the code it describes.

## `onResize` can fire between frames, outside the frame's error handling

**Package:** `@spearwolf/offscreen-display` (0.4.0). Low priority.

Since 0.4.0 the frame loop pauses while the canvas is 0×0 or out of view. A size that arrives while
the loop is paused is applied to the signals at once in `parseMessageData()`
(`src/lib/worker/OffscreenWorkerDisplay.js`, the `#syncSize()` call after `#updateFrameLoop()`), so
listeners still hear `onResize` after the canvas was cleared by its new size. Before, sizes reached
the signals only inside `#onFrame()`.

Two consequences:

- A listener that throws in `onResize` now throws out of the worker's message handler whenever
  this happens, not inside `#onFrame()`'s `try`/`catch`. Inside a frame, the same error repeated
  frame after frame reaches the main thread only once. Out here, every hide or show raises its own
  `error` event. Example: a listener that sizes a WebGL framebuffer and throws on 0×0.
- A main thread of your own that sends `{resize}` before `{isConnected: true}` now gets `onResize`
  with the real size before `onInit`. The initial retained `onResize` (0×0) already came before
  `onInit`, so the order itself is not new.

The README (`onResize` under "`OffscreenWorkerDisplay` — the display, worker") does not mention
either. At least add a sentence there saying that `onResize` may fire between frames while the loop
is paused. Optionally put the out-of-frame `#syncSize()` under the same error handling as the
frame: a shared helper that catches, deduplicates and rethrows.

## A same-origin iframe scrolled out of its parent keeps animating

**Package:** `@spearwolf/offscreen-display` (0.4.0). Low priority.

`OffscreenDisplay` pauses the worker's frames through an `IntersectionObserver` whose root is the
element's own document (`#observeIntersection()` in `src/lib/main/OffscreenDisplay.js`), with
`rootMargin: '200px'`. The document was chosen on purpose over the implicit root. With the implicit
root, the margin only widens the top-level viewport, and an iframe clips the target at its own
edge first. The 200px margin would then do nothing inside any iframe, and the root margin test in
`test/offscreen-display.test.js` fails, because Vitest runs its tests in an iframe.

The cost: the document root sees only the iframe's own viewport. A same-origin iframe, such as
Storybook or an embedded demo, that is scrolled out of its parent page counts as visible and keeps
animating. Browsers throttle cross-origin iframes that are out of view on their own; same-origin
ones not always.

Possible fix: a second observer with the implicit root and no margin. The element counts as
visible only while both observers say so. It costs a few lines and one more message state
(or a combined flag computed on the main thread). Test it with an element inside a same-origin
iframe that is scrolled out of the test page.

## The 200px margin does not apply at the edge of a scroll container

**Package:** `@spearwolf/offscreen-display` (0.4.0). Low priority, possibly just a README sentence.

`rootMargin` widens only the root, the document's viewport, not the clipping ancestors in between.
An element just outside the visible area of an `overflow: auto` container is paused right at the
container's edge. Scrolling it in then shows the image from when it left for a frame or so. It
shows an empty canvas if a resize cleared the canvas in the meantime. The implicit root would
behave the same.

Options: `scrollMargin` on the `IntersectionObserver` (as of this writing possibly Chromium only;
check support in Firefox and Safari first), or document the limitation next to the "Pausing" bullet in the README.

## The `bundle.js` guard only looks for one file name

**Package:** `rainbow-line` (0.6.0), test only. Low priority.

`e2e/tests/npm-packages.spec.js`, test `the rainbow-line bundle does not reference a worker file, so
bundlers emit none next to it`, checks that the built `bundle.js` does not contain
`rainbow-line.worker.js`. Bundlers react to any `new Worker(new URL(…, import.meta.url))`, so a
renamed worker, or any other `new URL(…, import.meta.url)` that ends up in the bundle, would pass
the check and still make consumer bundlers emit an asset. Also asserting that `bundle.js` does not
contain `import.meta.url` catches the general case; the current bundle already satisfies it.

## `#onCanvasIntersection` does not check which canvas an entry belongs to

**Package:** `@spearwolf/offscreen-display` (0.4.0). Hardening, no known failure.

`#onCanvasIntersection(entries)` in `src/lib/main/OffscreenDisplay.js` posts
`entries.at(-1).isIntersecting` without looking at `entry.target`. The observer survives
`dispose()` and a reconnect, which observes a fresh canvas. An entry for the old canvas that was
queued before `disconnect()` would still come before the fresh canvas's first entry, so the last
entry wins and the result is correct today. Filtering on `entry.target === this.canvas` would state
that instead of relying on the delivery order.
