# Paket 2 — offscreen-display: Lebenszyklus, Frame-Loop und Größenmessung

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: RES-001 (high), RES-002 (low), CORR-002 (medium), PERF-002 (medium), CORR-005 (low), TEST-001 (medium, Teil — siehe »Schnitt«)
- Ziel: Ein entferntes Element beendet seinen Worker, der Frame-Loop übersteht Listener-Fehler, und die Canvas-Größe kommt per `ResizeObserver` in physischen Pixeln — abgesichert durch Lifecycle-Tests und e2e in Chromium, Firefox und (in CI) WebKit.
- Modell: stärkste Stufe
- Effort: high — öffentliche API (`dispose()`, `destroy()`, `pixelRatio`, Semantik von `{resize}` und `onResize`) und Lifecycle-Timing
- Dateien:
  - `packages/offscreen-display/src/lib/main/OffscreenDisplay.js`
  - `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`
  - `packages/offscreen-display/test/offscreen-display.test.js`
  - `packages/offscreen-display/test/fixtures/test-display.worker.js`
  - `packages/offscreen-display/CHANGELOG.md`
  - `packages/rainbow-line/src/RainbowLineWorkerDisplay.js`
  - `packages/rainbow-line/test/rainbowLineBehaviour.js`
  - `packages/rainbow-line/CHANGELOG.md`
  - `e2e/playwright.config.js`, `e2e/tests/rainbow-line.spec.js`
  - `nx.json`, `package.json`, `.github/workflows/main.yml`
  - `CLAUDE.md`, `README.md`
- Verify: `E2E_SKIP_WEBKIT=1 pnpm verify` (lint, typecheck, build, test, e2e in Chromium und Firefox; WebKit läuft nur in CI, siehe »Entscheidungen« im Plan)
- Commit:

  ```
  offscreen-display: dispose removed elements, size the canvas in device pixels

  - terminate the worker one animation frame after the element left the document; dispose() does it
    on demand, a later reconnect starts a fresh worker with a fresh canvas
  - observe the canvas with a ResizeObserver and send its size in physical pixels plus pixelRatio;
    rainbow-line scales color-slice-width with it
  - keep the worker frame loop running when a listener throws, add OffscreenWorkerDisplay#destroy()
  - run the e2e suite in firefox and webkit too (E2E_SKIP_WEBKIT=1 leaves webkit out locally),
    poll instead of sleeping in the animation tests
  ```

- Verlauf:
  - 2026-09-22 Zug 0: Detailplan steht · RES-001, RES-002, CORR-002, PERF-002, CORR-005, TEST-001 unverändert (Quelldateien seit e57a13c unberührt) · keine Folgen aus Paket 1, »Offene Befunde« leer · TEST-001 geteilt: Negativ-Tests und `cycle-colors-repeat`-Laufzeittest nach Paket 3 · Playwright-WebKit startet hier nicht (fehlende `libicu*.so.74`, `libflite.so.1`) → Nutzer: WebKit nur in CI, lokal `E2E_SKIP_WEBKIT=1`
  - 2026-09-22 Zug 1: Implementierer beauftragt (opus, effort high), Brief `$ARBEITSDIR/paket-2.impl-1.brief.txt`, Report nach `paket-2.impl-1.json`
  - 2026-09-22 Zug 2: Report FERTIG_MIT_VORBEHALT (HiDPI-e2e in eigener Datei `e2e/tests/rainbow-line-hidpi.spec.js`, WebKit nur CI) · 15 Dateien geändert, 1 neu · rote Läufe belegt (offscreen-display 7 rot, rainbow-line 2, e2e 8) · signalsBefore=5/signalsAfter=0 · Arbeitsbaum schmutzig · Verify exit=0, `$ARBEITSDIR/paket-2.verify.log`
  - 2026-09-22 Zug 3: Reviewer beauftragt (opus, effort high), Diff `$ARBEITSDIR/paket-2.diff`, Report nach `paket-2.review-1.json`
  - 2026-09-22 Zug 3: Urteil freigeben · alle sechs Findings behoben · kritisch 0, wichtig 0, klein 7 · Diff `$ARBEITSDIR/paket-2.diff`
  - 2026-09-22 Zug 4: keine Runde nötig
  - 2026-09-22 Zug 5: committet als 7b2b0ce (16 Dateien, +434/−106), Verify `$ARBEITSDIR/paket-2.verify.log` exit=0, Trailer `Remediation-Run: 2026-09-22`

## Abgleich

| Finding | Fundstelle jetzt | Urteil |
| --- | --- | --- |
| RES-001 | `OffscreenDisplay.js:155-158` — `disconnectedCallback()` postet nur `{isConnected: false}` und cancelt den rAF; `terminate` kommt in `src/` nicht vor. Tests umgehen es: `offscreen-display.test.js:52-57`, `rainbowLineBehaviour.js:43-48` | unverändert |
| RES-002 | `OffscreenWorkerDisplay.js:26-73` — vier Signale, drei Effekte ohne `attach`; keine `destroy()` | unverändert |
| CORR-002 | `OffscreenWorkerDisplay.js:84-99` — `emit(… Frame …)` Zeile 94, `#requestAnimationFrame()` Zeile 98, kein `try`/`finally` | unverändert |
| PERF-002 | `OffscreenDisplay.js:87-107` — `#onFrame` ruft pro Frame `#ifCanvasSizeChanged` → `getBoundingClientRect()` | unverändert |
| CORR-005 | `OffscreenDisplay.js:80-85` (`#readCanvasSize`, CSS-Pixel) und `OffscreenWorkerDisplay.js:120-123` (`canvas.width = Math.floor(resize.width)`); `devicePixelRatio` kommt nicht vor | unverändert |
| TEST-001 | `afterEach` mit `terminate()` wie oben; `sleep(300)` `rainbowLineBehaviour.js:75`, `sleep(250)` `:123`, `page.waitForTimeout(300)` `e2e/tests/rainbow-line.spec.js:30`; `e2e/playwright.config.js:15` nur Chromium | unverändert |

Browser-Stand auf dieser Maschine, per Playwright gestartet: Chromium 153 und
Firefox 155 laufen, beide mit `OffscreenCanvas`, `transferControlToOffscreen`,
`ResizeObserver` mit `device-pixel-content-box` und Modul-Workern. WebKit
(Build 2359) ist heruntergeladen, startet aber nicht: CachyOS hat ICU 78 und
kein flite. `pnpm exec playwright install chromium firefox webkit` endet
trotzdem mit Exit 0.

## Schnitt

TEST-001 ist auf Paket 2 und Paket 3 verteilt. Hier: der Test, dass ein
entferntes Element seinen Worker beendet, der Wegfall des manuellen
`terminate()` in beiden `afterEach`, der Test für einen werfenden
`onFrame`-Listener, `expect.poll` statt fester Wartezeiten in den
Animations-Tests, Firefox und WebKit als Playwright-Projekte. Nach Paket 3
gehen die Negativ-Tests für die Wertebereiche aus CORR-001 und CORR-003 und
der Test für einen Laufzeitwechsel von `cycle-colors-repeat` (CORR-004) —
das sind dort die Regressionstests der Fixes und müssen vor ihnen rot sein.
Der Reviewer beurteilt TEST-001 hier nur am Paket-2-Teil.

## Abweichungen von der Empfehlung des Audits

- **Kein `FinalizationRegistry`-Backstop** (RES-001). Ein verbundenes Element
  ist vom Dokument aus erreichbar, ein getrenntes hat einen rAF später keinen
  Worker mehr — der Backstop hätte nichts zu fangen. Die Entscheidung zu
  RES-001 im Plan nennt ihn nicht.
- **Keine `{close: true}`-Nachricht und kein `self.close()` in
  `OffscreenWorkerDisplay`** (RES-002). Die Klasse besitzt den Worker-Scope
  nicht — genau der Fall, für den `destroy()` gebraucht wird, ist ein Worker
  mit mehreren Displays. Der Main-Thread beendet den Worker laut Entscheidung
  per `terminate()`; eine Nachricht, die niemand schickt, entfällt.
- **Kein `postMessage({error})` aus dem Worker** (CORR-002). Mit
  `try`/`finally` fliegt die Exception weiter aus dem rAF-Callback und kommt
  als Standard-`error`-Event am `Worker`-Objekt im Main-Thread an. Ein
  zweiter, eigener Kanal wäre doppelt und setzte wieder voraus, dass die
  Klasse den Scope besitzt.
- **Initiale Größe ohne synchronen Layout-Read** (PERF-002): kommt vom ersten
  Observer-Callback. Damit der Worker vorher nicht in die 300×150 der
  Default-Canvas zeichnet, emittiert er `onFrame` erst nach der ersten
  `{resize}`-Nachricht (Schritt 2).

## Vorgehen

### 1. `OffscreenDisplay.js` (Main-Thread)

Entfernen: `#lastCanvasWidth`, `#lastCanvasHeight`, `#rafID`,
`#readCanvasSize()`, `#ifCanvasSizeChanged()`, `#onFrame`,
`#requestAnimationFrame()`, `#cancelAnimationFrame()`. Der Main-Thread hat
danach keinen dauerhaften rAF-Loop mehr.

Neue private Felder:

- `#resizeObserver = new ResizeObserver((entries) => this.#onCanvasResize(entries))`
- `#observedBox` — `'device-pixel-content-box'` oder `'content-box'`, gesetzt beim Beobachten
- `#pixelRatioQuery` — die aktuelle `MediaQueryList`, oder `undefined`
- `#disposeRafID = 0`
- `#canvasTransferred = false`

`#observeCanvas()`:

```js
try {
  this.#resizeObserver.observe(this.canvas, {box: 'device-pixel-content-box'});
  this.#observedBox = 'device-pixel-content-box';
} catch {
  // WebKit does not support this box and throws a TypeError
  this.#resizeObserver.observe(this.canvas, {box: 'content-box'});
  this.#observedBox = 'content-box';
}
this.#watchPixelRatio();
```

`#onCanvasResize(entries)`: nimmt `entries.at(-1)` (beobachtet wird nur die
Canvas). `pixelRatio = window.devicePixelRatio`. Ist
`#observedBox === 'device-pixel-content-box'`, dann
`width = entry.devicePixelContentBoxSize[0].inlineSize`,
`height = entry.devicePixelContentBoxSize[0].blockSize`; sonst
`width = Math.round(entry.contentRect.width * pixelRatio)`,
`height = Math.round(entry.contentRect.height * pixelRatio)`. Der Zweig hängt
bewusst an `#observedBox` und nicht daran, ob der Entry das Feld trägt —
Chromium liefert es auch bei `content-box`, und der Fallback-Test (Schritt 5)
muss den Fallback-Zweig wirklich durchlaufen. Dann
`this.worker?.postMessage({resize: {width, height, pixelRatio}})`.

`#watchPixelRatio()`: alten Listener von `#pixelRatioQuery` abmelden,
`#pixelRatioQuery = matchMedia(\`(resolution: ${window.devicePixelRatio}dppx)\`)`,
`change`-Listener `#onPixelRatioChange` anmelden. `#onPixelRatioChange` ist ein
Arrow-Feld: `this.#resizeObserver.unobserve(this.canvas); this.#observeCanvas();`
— eine neue Beobachtung meldet die Größe einmal neu, und im
`content-box`-Fallback ist das der einzige Weg, einen Wechsel des
`devicePixelRatio` (Zoom, anderer Bildschirm) ohne Größenänderung zu bemerken.
Ein Kommentar sagt das in einem Satz.

`#unobserveCanvas()`: `this.#resizeObserver.disconnect()`, Listener von
`#pixelRatioQuery` abmelden, `#pixelRatioQuery = undefined`.

`#setupWorker()`:

```js
let canvas = this.queryCanvasElement();
if (this.#canvasTransferred) {
  // the control of a canvas can only be transferred once, a new worker needs a new canvas element
  const freshCanvas = /** @type {HTMLCanvasElement} */ (canvas.cloneNode(false));
  canvas.replaceWith(freshCanvas);
  canvas = freshCanvas;
}
this.canvas = canvas;
const offscreen = canvas.transferControlToOffscreen();
this.#canvasTransferred = true;
// … createWorker() und postMessage({canvas, contextAttributes, ...getInitialWorkerAttributes()}) wie bisher
```

`connectedCallback()`:

```js
cancelAnimationFrame(this.#disposeRafID);
if (!this.worker) {
  this.#setupWorker();
}
this.worker.postMessage({isConnected: true});
this.#observeCanvas();
```

`disconnectedCallback()`:

```js
this.#unobserveCanvas();
if (!this.worker) return;
this.worker.postMessage({isConnected: false});
// moving the element (remove and insert within the same task) keeps the worker; it is only terminated
// when the element is still disconnected one animation frame later
this.#disposeRafID = requestAnimationFrame(() => {
  if (!this.isConnected) this.dispose();
});
```

Neue öffentliche Methode `dispose()`, idempotent, mit JSDoc (was sie tut, dass
das Element sie einen Frame nach dem Entfernen selbst aufruft, dass ein
späteres Verbinden einen frischen Worker mit frischer Canvas startet):

```js
cancelAnimationFrame(this.#disposeRafID);
this.#unobserveCanvas();
this.worker?.terminate();
this.worker = undefined;
```

JSDoc am Konstruktor-Parameter `initialHTML` ergänzen: die Canvas muss ihre
angezeigte Größe aus CSS bekommen (die Default-Styles strecken sie über das
Element), denn ihre Pixelgröße folgt der angezeigten Größe in physischen
Pixeln — eine Canvas, die sich über ihre intrinsische Größe misst, würde sich
aufschaukeln. `// TODO adpoptedCallback ?` bleibt stehen.

### 2. `OffscreenWorkerDisplay.js` (Worker)

- Import ergänzen: `off` aus `@spearwolf/eventize`, `SignalGroup` aus
  `@spearwolf/signalize`.
- Alle Signale mit `createSignal(<initial>, {attach: this})`. Neues fünftes
  Signal `pixelRatio$ = createSignal(1, {attach: this})`, als Property
  `pixelRatio` im selben `Object.defineProperties`-Block wie die anderen.
- Alle drei Effekte in Optionsform:
  `createEffect(fn, {dependencies: [...], attach: this})`. Der Resize-Effekt
  hängt an `[canvasWidth$, canvasHeight$, pixelRatio$]`. (signalize 1.0:
  statische `dependencies` überspringen den ersten Lauf — wie bisher.)
- Neue private Felder `#receivedPixelRatio = 1`, `#hasSize = false`,
  `#destroyed = false`.
- `parseMessageData(data)`: erste Zeile `if (!data || this.#destroyed) return;`.
  Der `resize`-Zweig:

  ```js
  if (data.resize && this.canvas) {
    const width = Math.floor(data.resize.width);
    const height = Math.floor(data.resize.height);
    // assigning a size clears the canvas even if it is the same, so only a real change touches it
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    this.#receivedPixelRatio = data.resize.pixelRatio ?? 1;
    this.#hasSize = true;
  }
  ```

- `#onFrame(now)`:

  ```js
  try {
    if (this.ready && this.#hasSize) {
      batch(() => {
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.pixelRatio = this.#receivedPixelRatio;
      });
      this.now = now / 1000;
      if (this.canvasWidth > 0 && this.canvasHeight > 0) {
        emit(this.#emitter, OffscreenWorkerDisplay.Frame, this);
      }
    }
  } finally {
    // a throwing listener must not end the animation; the error still reaches the main thread as an error event of the worker
    this.#requestAnimationFrame();
  }
  ```

  Das `pixelRatio`-Signal wird bewusst im selben `batch` wie Breite und Höhe
  gesetzt, damit `onResize` einmal mit zusammenpassenden Werten feuert.
- `#requestAnimationFrame()`: erste Zeile `if (this.#destroyed) return;`.
- Neue öffentliche Methode `destroy()` mit JSDoc (beendet den Frame-Loop,
  entfernt alle Listener und retained Events, zerstört Signale und Effekte;
  danach ignoriert die Instanz jede Nachricht):

  ```js
  this.#destroyed = true;
  this.#cancelAnimationFrame();
  off(this);
  SignalGroup.delete(this);
  ```

### 3. `RainbowLineWorkerDisplay.js`

In `onFrame` `pixelRatio` mit destrukturieren. Für Werte ab 1 ist
`color-slice-width` in CSS-Pixeln, die Canvas hat physische Pixel:

```js
const _colorSliceWidth =
  colorSliceWidth < 1 ? Math.round(colorSliceWidth * w) : Math.max(1, Math.round(colorSliceWidth * pixelRatio));
```

`Math.max(1, …)` verhindert, dass die Umrechnung (etwa `1.2 × 0.4`) eine
Breite 0 und damit eine Endlosschleife erzeugt. Der Zweig `< 1` bleibt
unverändert; seine Hänger-Werte behebt Paket 3 (CORR-001) samt der ganzen
Zeichenroutine. Sonst nichts an dieser Datei ändern.

### 4. Test-Fixture `test/fixtures/test-display.worker.js`

- `import {getSignalsCount} from '@spearwolf/signalize';`
- `onResize({canvasWidth, canvasHeight, pixelRatio})` meldet
  `{event: 'resize', width, height, pixelRatio}`; `onFrame` meldet zusätzlich
  `pixelRatio`.
- `onFrame` wirft einmal `new Error('boom from onFrame')`, wenn vorher
  `{throwInNextFrame: true}` kam (Flag zurücksetzen, dann werfen).
- `{destroy: true}`: `signalsBefore = getSignalsCount()`, `display.destroy()`,
  dann `self.postMessage({event: 'destroyed', signalsBefore, signalsAfter: getSignalsCount()})`.
- Beide Steuer-Nachrichten kehren wie `fillStyle` vor `parseMessageData` zurück.

### 5. `packages/offscreen-display/test/offscreen-display.test.js`

`TestDisplay.createWorker()` ergänzen: `errors = []` und
`terminatedWorkers = []` als Felder; ein `error`-Listener am Worker ruft
`event.preventDefault()` (sonst meldet der Browser den Fehler als
unbehandelten Fehler der Seite und Vitest bricht ab) und pusht
`event.message`; `worker.terminate` wird so umhüllt, dass der Worker vor dem
Original-Aufruf in `terminatedWorkers` landet.

`afterEach`: nur noch `display.remove()`, kein `terminate()`.

Anpassen: »resizes the offscreen canvas to the size of the element« erwartet
`{event: 'resize', width: 320, height: 240, pixelRatio: 1}` bzw. `200`/`100`.

Ersetzen: »stops rendering frames while disconnected and resumes on
reconnect« durch diese Tests. 2 bis 7 sind Regressionstests und müssen vor dem
Fix rot sein; 1 sichert die Gnadenfrist ab und ist schon vorher grün:

1. `keeps its worker when it is moved to another place in the document` —
   Worker merken, einen `div` an `body` hängen, das Element hineinverschieben
   (`container.append(display)`), per `expect.poll` weitere Frames abwarten;
   `display.worker` ist derselbe, `terminatedWorkers` leer. Container am
   Testende entfernen.
2. `terminates its worker one animation frame after it was removed` —
   Worker merken, `display.remove()`,
   `await expect.poll(() => display.worker).toBeUndefined()`,
   `terminatedWorkers` gleich `[worker]`.
3. `starts a fresh worker with a fresh canvas when it is connected again` —
   entfernen, auf `worker === undefined` warten, alte Canvas merken, wieder
   anhängen: neuer Worker ungleich altem, `display.canvas` ungleich alter
   Canvas, genau eine `canvas` im Shadow-Root, `queryCanvasElement()` gleich
   `display.canvas`, `readMiddlePixel` pollt auf `[255, 0, 0]`.
4. `dispose() terminates the worker of a connected element` — Frames
   abwarten, `dispose()`: `worker` undefined, `terminatedWorkers` enthält ihn;
   Frame-Zahl merken, 300 ms warten, Zahl unverändert (Abwesenheit braucht
   eine feste Wartezeit); `display.remove()` wirft nicht.
5. `keeps rendering frames after an onFrame listener threw` —
   `{throwInNextFrame: true}` posten, `expect.poll(() => display.errors)`
   enthält eine Meldung passend zu `/boom from onFrame/`, danach wächst die
   Frame-Zahl per `expect.poll` um mehr als 2.
6. `destroy() ends the frame loop and releases the signals of the display` —
   `{destroy: true}` posten, auf das `destroyed`-Event pollen,
   `signalsAfter` gleich `signalsBefore - 5` (die fünf Signale der Instanz;
   zählt `getSignalsCount()` anders, gilt `signalsAfter < signalsBefore`, und
   der Report nennt die gemessenen Zahlen); Frame-Zahl merken, 300 ms warten,
   unverändert.
7. `measures the canvas in css pixels times devicePixelRatio where the device
   pixel box is not supported` — vor dem Mounten
   `ResizeObserver.prototype.observe` so umhüllen, dass es bei
   `{box: 'device-pixel-content-box'}` einen `TypeError` wirft und sonst das
   Original ruft; im `finally` zurücksetzen. Erwartet das Resize-Event
   `{event: 'resize', width: 320, height: 240, pixelRatio: 1}`. Das ist der
   einzige lokale Lauf des WebKit-Pfads.

### 6. `packages/rainbow-line/test/rainbowLineBehaviour.js`

- `afterEach`: nur noch `line.remove()`.
- »animates the colors«: `sleep(300)` + Vergleich ersetzen durch
  `await expect.poll(() => readRow(line)).not.toEqual(before)`.
- »cycle-direction and slice-cycle-time …«: `sleep(250)` ersetzen — per
  `expect.poll` die Farbe bei x=0 lesen, die normalisierte Verschiebung
  `((second - first + 540) % 360) - 180` in einer äußeren Variablen halten und
  pollen, bis ihr Betrag größer als 5 ist; danach das Vorzeichen prüfen wie
  bisher. Bei `slice-cycle-time="4"` sind das 90°/s, weit weg vom Umbruch bei
  180°.
- Neuer Test `terminates its worker once it has been removed`: mounten, auf
  gezeichnete Zeile warten, `line.remove()`,
  `await expect.poll(() => line.worker).toBeUndefined()`. Zeigt, dass beide
  Builds (auch `bundle.js` mit eingebettetem offscreen-display) den Fix tragen.
- `sleep` entfernen, falls danach unbenutzt.

### 7. e2e

`e2e/playwright.config.js`:

```js
// Playwright's webkit needs system libraries that not every Linux distribution provides (ICU 74 and flite,
// missing on Arch-based systems); E2E_SKIP_WEBKIT=1 leaves it out locally, CI always runs it
const skipWebkit = !!process.env.E2E_SKIP_WEBKIT && !process.env.CI;
if (skipWebkit) console.warn('e2e: skipping the webkit project (E2E_SKIP_WEBKIT is set)');
```

`projects`: `chromium` wie bisher; `firefox` mit `devices['Desktop Firefox']`,
`webkit` mit `devices['Desktop Safari']` (nur wenn nicht `skipWebkit`). Beide
bekommen `testIgnore: 'npm-packages.spec.js'` — diese Spec liest nur Dateien
und braucht keinen Browser.

`e2e/tests/rainbow-line.spec.js`, in der `VARIANTS`-Schleife:

- »draws an animated rainbow«: `page.waitForTimeout(300)` + Vergleich ersetzen
  durch `await expect.poll(() => readRow(line)).not.toEqual(row)`.
- Neu `terminates the workers of removed elements`: Seite laden,
  `expect.poll(() => page.workers().length).toBe(2)`; per `page.evaluate` fünf
  `rainbow-line` ohne `id` anhängen; **erst** auf 7 Worker pollen (sonst ist
  der Test vor dem Fix grün, weil die Worker noch gar nicht gestartet sind);
  per `page.evaluate` alle `rainbow-line:not([id])` entfernen; auf 2 pollen.
- Neu `test.describe('on a screen with devicePixelRatio 2', …)` mit
  `test.use({deviceScaleFactor: 2})` und Test `draws its color slices in
  physical pixels`: `#default` gezeichnet abwarten, `readRow` hat Länge 720,
  `colorRuns(row)` ist 36 (10 CSS-Pixel = 20 physische Pixel). Vor dem Fix rot:
  die 360 Pixel breite Canvas wird hochskaliert, jede Kante bekommt
  Mischpixel.

Fallen in Firefox oder WebKit Requests an, die Chromium nicht stellt (etwa
`/favicon.ico` → 404 aus `e2e/server.mjs`), und schlägt `collectProblems`
deshalb an, gehört die Korrektur in dieses Paket — z. B.
`<link rel="icon" href="data:," />` in `e2e/pages/*.html` und
`e2e/src/pages/index.astro`. Die Astro-Tests laufen gegen das vendored
`rainbow-line-v0.4.0.js` (alter Code); was dort nur in Firefox bricht, ist ein
Nebenbefund, kein Grund zum Weglassen.

### 8. Werkzeug, CI und Doku

- `nx.json`, `targetDefaults.e2e.inputs`: `{"env": "E2E_SKIP_WEBKIT"}`
  ergänzen, damit der Cache Läufe mit und ohne WebKit nicht verwechselt.
- `package.json`: `"playwright:install": "playwright install chromium firefox webkit"`.
- `.github/workflows/main.yml`, Schritt »Install playwright browsers«:
  `run: pnpm playwright:install --with-deps`.
- `CLAUDE.md`:
  - Zeile 15: Kommentar zu `pnpm playwright:install` → chromium, firefox und
    webkit (vitest nutzt chromium, e2e alle drei).
  - e2e-Punkt unter »Tests«: Playwright läuft in chromium, firefox und webkit;
    `E2E_SKIP_WEBKIT=1` lässt webkit lokal aus (sein Linux-Build braucht ICU 74
    und flite, die Arch-basierte Systeme nicht haben), CI führt immer alle
    drei aus.
  - Zeile 48: der Satz über den rAF-Loop wird ersetzt — ein `ResizeObserver`
    (`device-pixel-content-box`, sonst Content-Box × `devicePixelRatio`)
    postet `{resize: {width, height, pixelRatio}}` in physischen Pixeln; einen
    Animation-Frame nach dem Trennen beendet das Element seinen Worker
    (`dispose()`), ein späteres Verbinden startet einen frischen Worker mit
    frischer Canvas.
  - Zeile 49: `pixelRatio` bei den Worker-Properties; `onFrame` erst nach der
    ersten Größe; `destroy()`; ein werfender Listener beendet den Frame-Loop
    nicht.
- `README.md` Zeile 19: die Tests laufen in headless chromium, firefox und
  webkit; nach dem Install-Block ein Satz zu `E2E_SKIP_WEBKIT=1`.
- `packages/offscreen-display/CHANGELOG.md` unter `[Unreleased]`:
  - Added: `OffscreenDisplay#dispose()`, `OffscreenWorkerDisplay#destroy()`,
    `OffscreenWorkerDisplay#pixelRatio`.
  - Changed: ein aus dem Dokument entferntes Element beendet seinen Worker
    einen Animation-Frame später, ein erneutes Verbinden danach startet einen
    frischen Worker mit frischer Canvas; die Canvas-Größe kommt von einem
    `ResizeObserver`; `{resize}` und damit `canvasWidth`/`canvasHeight` sind
    physische Pixel (**breaking** für Subklassen, die CSS-Pixel annehmen);
    `onResize` feuert auch bei geändertem `pixelRatio`; `onFrame` beginnt erst
    nach der ersten Größe.
  - Fixed: der Worker lief nach dem Entfernen des Elements weiter; ein
    werfender `onFrame`-Listener beendete die Animation.
- `packages/rainbow-line/CHANGELOG.md` unter `[Unreleased]`, Fixed: auf
  Bildschirmen mit `devicePixelRatio` > 1 scharf (die Canvas hat physische
  Pixel, `color-slice-width` bleibt in CSS-Pixeln); ein entferntes Element
  beendet seinen Worker.
- Keine Versions-Bumps — die macht Paket 4.

## Findings im Volltext

**RES-001 · high · packages/offscreen-display/src/lib/main/OffscreenDisplay.js:155** — Worker beim Entfernen des Elements beenden und eine `dispose()`-API anbieten
`disconnectedCallback()` schickt nur `{isConnected: false}` und stoppt den Main-Thread-rAF; der Worker selbst wird nie terminiert, und es gibt keine öffentliche Methode dafür. Ein Dedicated Worker mit registriertem `message`-Listener ist ein *protected worker* und wird vom Browser erst mit dem Dokument aufgeräumt. Jede Element-Instanz, die eine SPA anlegt und wieder verwirft (Routing, Listen, Re-Render), hinterlässt also dauerhaft einen Thread, das transferierte OffscreenCanvas samt Backing-Store, alle signalize-Signale und -Effekte sowie das eventize-Registry im Worker. Die eigenen Tests umgehen das, indem sie `line.worker?.terminate()` in `afterEach` selbst aufrufen — die Suite dokumentiert damit die fehlende Lifecycle-API, statt sie zu fordern.
Beleg: Messung mit Playwright gegen `e2e/pages/bundle.html`: 2 Worker nach dem Laden, nach 30× `createElement` + `append` + `remove` und erzwungenem GC: **32 Worker**. Im Quelltext von `src/` kommt `terminate` nicht vor.
Empfehlung: Eine `dispose()`-Methode einführen, die `worker.terminate()` aufruft, den rAF cancelt und `this.worker = undefined` setzt. In `disconnectedCallback()` das Beenden mit einer kurzen Gnadenfrist (Microtask oder ein rAF) planen, damit ein reines DOM-Verschieben (`append` an anderer Stelle im selben Tick) den Worker behält; kommt innerhalb der Frist ein `connectedCallback()`, wird die Frist verworfen. Da die Canvas-Kontrolle nur einmal übertragbar ist, muss `#setupWorker()` bei einem späteren Re-Connect ein frisches `<canvas>` in den Shadow-Root setzen (altes Element durch `cloneNode(false)` ersetzen). Zusätzlich ein `FinalizationRegistry` als Backstop, das den Worker terminiert, wenn das Element ohne `dispose()` unerreichbar wird. Die Tests sollten anschließend mit `page.workers().length` bzw. einer Zählung im Worker-Fixture prüfen, dass nach `remove()` kein Worker übrig bleibt.

**RES-002 · low · packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:59** — `OffscreenWorkerDisplay` einen `destroy()`-Pfad geben
Der Konstruktor legt vier Signale und drei Effekte ohne `attach` an; laut signalize-Semantik bleiben unattached Effekte über die globalen Registries erreichbar, bis sie explizit zerstört werden. Dazu kommt ein rAF-Loop, den nur `{isConnected: false}` anhält, und eventize-Listener samt retained Events. Eine Instanz pro Worker ist dadurch nicht das Problem — der Worker stirbt mit ihr. Sobald aber ein Worker mehrere Displays hostet oder Tests Instanzen in einem gemeinsamen Kontext anlegen, wächst der Zustand ohne Rückweg. Die Klasse hat weder `destroy()` noch eine Reaktion auf eine `close`-Nachricht.
Empfehlung: Effekte mit `{attach: this}` erzeugen und eine `destroy()`-Methode ergänzen, die `SignalGroup.delete(this)`, `off(this)` und `#cancelAnimationFrame()` aufruft. In `parseMessageData()` eine `{close: true}`-Nachricht verstehen, die `destroy()` und `self.close()` auslöst — damit hat der Main-Thread (RES-001) neben `terminate()` auch einen kooperativen Weg.

**CORR-002 · medium · packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:84** — Frame-Loop gegen Exceptions im `onFrame`-Listener absichern
`#onFrame()` emittiert `onFrame` und ruft erst danach `#requestAnimationFrame()`. eventize' `emit()` lässt eine Exception aus einem Listener nach oben durchschlagen, also wird der nächste Frame nie angefordert: ein einziger Fehler in einer Zeichenroutine beendet die Animation dauerhaft und lautlos (im Main-Thread kommt nur ein generisches `error`-Event am Worker an, das niemand abonniert). Für `rainbow-line` ist das der Pfad, über den eine ungültige Farbe (CORR-003) die Linie einfriert. Auch `isConnected: true` nach so einem Absturz hilft nicht, weil `parseMessageData()` den Loop nur bei einem Zustandswechsel neu startet.
Beleg: `emit(this.#emitter, OffscreenWorkerDisplay.Frame, this);` in Zeile 94, `this.#requestAnimationFrame();` erst in Zeile 98 — kein `try`/`finally`.
Empfehlung: Den nächsten Frame vor dem Emit anfordern oder den Emit in `try { … } finally { this.#requestAnimationFrame(); }` packen. Optional `emitSafe()` für `onFrame` erwägen, dann läuft bei mehreren Listenern der Rest des Frames weiter; der Preis ist laut eventize-Dokumentation ein prozessweiter Overhead von rund 29 % pro Dispatch, sobald eine guarded Variante einmal benutzt wurde — bei einem einzigen Listener pro Worker ist `try`/`finally` die günstigere Wahl. Fehler zusätzlich per `self.postMessage({error})` an den Main-Thread melden, damit ein Element darauf reagieren kann.

**PERF-002 · medium · packages/offscreen-display/src/lib/main/OffscreenDisplay.js:96** — Main-Thread-rAF-Polling von `getBoundingClientRect()` durch `ResizeObserver` ersetzen
Jedes verbundene Element hält auf dem Main-Thread einen eigenen `requestAnimationFrame`-Loop, der pro Frame `getBoundingClientRect()` liest, nur um eine Größenänderung zu erkennen. Dieses Lesen erzwingt bei anstehenden Style-Änderungen ein synchrones Layout (Layout Thrashing), und es passiert 60- bis 120-mal pro Sekunde für jedes Element — auch wenn sich nie etwas ändert und obwohl der Sinn der Architektur ist, den Main-Thread frei zu halten. Ein `ResizeObserver` liefert dieselbe Information ereignisgesteuert, ohne Layout-Reads und ohne laufenden rAF.
Beleg: `#onFrame = () => { this.#ifCanvasSizeChanged(...); this.#requestAnimationFrame(); }` — `#ifCanvasSizeChanged` ruft `this.canvas.getBoundingClientRect()` bei jedem Frame.
Empfehlung: In `connectedCallback()` einen `ResizeObserver` auf das Element (oder die Canvas) registrieren, mit `box: 'device-pixel-content-box'` wo verfügbar (löst CORR-005 gleich mit), und in `disconnectedCallback()` `disconnect()` aufrufen. Der rAF-Loop auf dem Main-Thread entfällt; die initiale Größe kommt vom ersten Observer-Callback.

**CORR-005 · low · packages/offscreen-display/src/lib/main/OffscreenDisplay.js:80** — Canvas-Auflösung an `devicePixelRatio` koppeln
Die an den Worker gemeldete Größe ist die CSS-Pixel-Größe aus `getBoundingClientRect()`, der Worker setzt `canvas.width/height` direkt darauf. Auf Displays mit `devicePixelRatio` 2 oder 3 wird der Backing-Store also auf die Hälfte bzw. ein Drittel der physischen Pixel gesetzt und vom Compositor hochskaliert — die Farbscheiben-Kanten von `rainbow-line` verschwimmen, obwohl Schärfe der Zweck der Komponente ist. `devicePixelRatio` kommt im Quelltext nicht vor. (Weitere Fundstelle: `OffscreenWorkerDisplay.js:120`.)
Empfehlung: Zusammen mit PERF-002 auf `ResizeObserver` mit `devicePixelContentBoxSize` umstellen (Fallback: `contentRect × devicePixelRatio`), die physische Pixelgröße an den Worker senden und die CSS-Größe weiter über das Stylesheet steuern. Zeichenroutinen, die in CSS-Pixeln rechnen, bekommen den Faktor als `pixelRatio` mit.

**TEST-001 · medium · packages/rainbow-line/test/rainbowLineBehaviour.js:43** — Lifecycle- und Negativ-Tests ergänzen, damit die Suite Leaks und Hänger meldet statt sie zu umgehen
Die Suite ist gut gebaut — Blackbox gegen Build-Output, Pixel-Assertions per Screenshot, E2E gegen die publizierten Verzeichnisse — hat aber Lücken genau dort, wo dieser Audit die Defekte findet: `afterEach` terminiert die Worker selbst und verdeckt so RES-001; kein Test prüft, was nach `remove()` mit dem Worker passiert. Es gibt keinen Negativ-Test (ungültige Farbe, `color-slice-width="0"`, `slice-cycle-time="0"`), keinen Test für eine Laufzeitänderung von `cycle-colors-repeat` (CORR-004) und keinen Test, dass die Animation nach einem Listener-Fehler weiterläuft (CORR-002). Die Build-Targets nennen `safari17` und `firefox122`, getestet wird nur Chromium. Timing-Assertions (`sleep(300)`, `waitForTimeout(300)`) plus `retries: 1` in CI können Flakiness kaschieren. (Weitere Fundstellen: `packages/offscreen-display/test/offscreen-display.test.js:52`, `packages/rainbow-line/test/rainbowLineBehaviour.js:104`, `e2e/playwright.config.js:9`, `vitest.shared.mjs:14`.)
Empfehlung: Einen Test »terminates its worker when removed« schreiben, der nach `remove()` über eine Nachricht aus dem Worker-Fixture oder Playwrights `page.workers()` prüft, dass kein Worker mehr läuft; das manuelle `terminate()` in `afterEach` danach entfernen. Negativ-Tests für die Wertebereiche aus CORR-001 und CORR-003 hinzufügen. Für die Animations-Tests `expect.poll` statt festem `sleep` nutzen. Ein zweites Playwright-Projekt `webkit` (mindestens für `bundle.html`) aufnehmen, sobald `pnpm playwright:install` es mitinstalliert.

## Urteil des Reviewers

Report: `$ARBEITSDIR/paket-2.review-1.json` (opus, effort high). Gesamturteil: freigeben.

| Finding | Urteil | Fundstelle |
| --- | --- | --- |
| RES-001 | behoben | `packages/offscreen-display/src/lib/main/OffscreenDisplay.js:190-199` (`disconnectedCallback` mit rAF-Gnadenfrist), `:201-212` (`dispose()`), `:142-162` (frische Canvas beim erneuten Verbinden) |
| RES-002 | behoben | `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:32-37`, `:71-94` (`attach: this`), `:133-138` (`destroy()`), `:141` (Nachrichten nach `destroy()` ignoriert) |
| CORR-002 | behoben | `OffscreenWorkerDisplay.js:106-127` (`try`/`finally`), Test `offscreen-display.test.js:456-465` |
| PERF-002 | behoben | `OffscreenDisplay.js:26`, `:90-127` (`ResizeObserver`, kein `getBoundingClientRect`), `OffscreenWorkerDisplay.js:109` |
| CORR-005 | behoben | `OffscreenDisplay.js:111-127`, `:129-140` (`matchMedia` für DPR-Wechsel), `OffscreenWorkerDisplay.js:111-115`, `packages/rainbow-line/src/RainbowLineWorkerDisplay.js:25-28`, e2e `e2e/tests/rainbow-line-hidpi.spec.js` |
| TEST-001 (Paket-2-Teil) | behoben | `offscreen-display.test.js:68-72`, `rainbowLineBehaviour.js:41-45` (kein manuelles `terminate()`), `offscreen-display.test.js:383-500`, `rainbowLineBehaviour.js:137-144`, `e2e/tests/rainbow-line.spec.js:59-77`, `e2e/playwright.config.js:20-25` |

Kleine Befunde:

1. `packages/offscreen-display/CHANGELOG.md:16` und `:30` — zwei `### Changed` unter `[Unreleased]` (→ Folgen im Plan).
2. `packages/rainbow-line/CHANGELOG.md:14` — Leerzeile in der Fixed-Liste (→ Folgen im Plan).
3. `e2e/playwright.config.js:10` — `console.warn` je Worker-Prozess, im Review-Lauf 29-mal (→ Folgen im Plan).
4. `offscreen-display.test.js:483-500` — der Fallback-Test unterscheidet bei DPR 1 die beiden Zweige nicht; er würde nicht rot, wenn der Code den Zweig wieder am Entry-Feld festmachte.
5. Die Worker-Seite von `{isConnected: false}` hat keinen Test mehr (→ Folgen im Plan).
6. `README.md:22` — »tests run in … firefox and webkit« gilt nur für e2e (→ Folgen im Plan).
7. `OffscreenWorkerDisplay.js:123-126` — ein Listener, der jeden Frame wirft, erzeugt jetzt rund 60 `error`-Events pro Sekunde im Main-Thread statt einer stehenden Animation; so gewollt, bis Paket 3 die Wertebereiche absichert.

Nebenbefunde des Implementierers, Begründung der Urteile: Tippfehler `adpoptedCallback` und die leeren JSDoc-Formulierungen stehen schon in `e57a13c` (per `git show` geprüft), also vorbestehend; die Scope-Regel nimmt jede Severity, daher `→ Scope`. Das »instead of `es2017`« in `packages/rainbow-line/CHANGELOG.md` stammt aus Paket 1 und ist deshalb Folge, nicht Nebenbefund.
