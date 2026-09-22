# Paket 2 — Laufzeit und Tests: Frame-Fehler drosseln, Wertebereich, Typen, Testschärfe

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: CORR-007 (info), CORR-006 (low), TYPES-002 (low), TYPES-003 (info), TEST-002 (low), TEST-003 (low),
  NEW-2 (low) · dazu aus »Offene Befunde«: der Firefox-Timeout in `e2e/tests/rainbow-line.spec.js:59` (gleiche
  Ursache wie NEW-2)
- Ziel: Worker-Loop und rainbow-line verhalten sich bei Fehlern und Randwerten begrenzt, die veröffentlichten Typen
  sind eng und beschrieben, und die Tests unterscheiden, was sie unterscheiden sollen, ohne flaky zu sein.
- Modell: mittlere Stufe
- Effort: medium
- Dateien:
  - `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`
  - `packages/offscreen-display/test/offscreen-display.test.js`
  - `packages/offscreen-display/test/fixtures/test-display.worker.js`
  - `packages/offscreen-display/README.md`, `packages/offscreen-display/CHANGELOG.md`
  - `packages/rainbow-line/src/RainbowLineWorkerDisplay.js`
  - `packages/rainbow-line/test/rainbowLineBehaviour.js`
  - `packages/rainbow-line/README.md`, `packages/rainbow-line/CHANGELOG.md`
  - `packages/astro-rainbow-line/rainbow-line-v0.5.0.js` (neu kopiert aus dem Build, nicht von Hand editiert)
  - `e2e/types/consumer.ts`, `e2e/playwright.config.js`
  - `CLAUDE.md`
- Vorgehen: siehe Abschnitt »Vorgehen« unten, Schritte 1–9 in dieser Reihenfolge
- Verify: `pnpm verify`
- Commit: `report a frame error that repeats only once, repeat the rainbow-line colors at most once per device pixel, type and describe the worker messages, sharpen the tests, give the e2e assertions 15 s`
- Verlauf:
  - 2026-09-22 Zug 0: Detailplan steht · CORR-007 unverändert (`OffscreenWorkerDisplay.js:151-172`) · CORR-006
    unverändert (`RainbowLineWorkerDisplay.js:55`), Ursache reicht weiter als der Befund: auch `1e308` und `1e-308`
    lassen die Linie schwarz, daher Deckel statt Endlichkeitsprüfung · TYPES-002 unverändert
    (`RainbowLineWorkerDisplay.js:92`) · TYPES-003 unverändert (`OffscreenWorkerDisplay.js:7`, `:18`; per Experiment mit
    tsc 7.0.2 bestätigt) · TEST-002 unverändert (`offscreen-display.test.js:269`) · TEST-003 unverändert
    (`rainbowLineBehaviour.js:199-200`) · NEW-2 unverändert (`astro-rainbow-line.spec.js:38`) · Queue-Eintrag
    `rainbow-line.spec.js:59` ins Paket genommen (gleiche Ursache) · Folgen aus Paket 1: keine · Restplan: Paket 2
    ist das letzte offene Paket, nichts umzusortieren oder zu teilen
  - 2026-09-22 Zug 1: Implementierer beauftragt (sonnet, effort medium, Session remediate-p2-impl-1), Brief `paket-2.impl-1.brief.txt`
  - 2026-09-22 Zug 2: Report FERTIG, 13 Dateien (Liste wie im Plan), rote Läufe belegt (CORR-007 57 statt 1 Fehler, CORR-006 4 rot, TYPES-002 TS2578, Mutationslauf TEST-002 rot), Lasttest `run-many -t build test e2e` grün · Arbeitsbaum schmutzig · eigener Verify `pnpm verify` ohne nx-Cache exit=0 (`paket-2.verify-2.log`; `paket-2.verify.log` war reiner Cache-Treffer)
  - 2026-09-22 Zug 3: Reviewer (opus, effort medium) — alle Findings behoben, 0 kritisch, 0 wichtig, 4 klein · Diff `paket-2.diff`, Report `paket-2.review-1.json`
  - 2026-09-22 Zug 4: keine Runde nötig
  - 2026-09-22 Zug 5: committet cadbd10 mit Trailer `Remediation-Run: 2026-09-22`, Verify `paket-2.verify-2.log` exit=0 (keine Änderung seit dem Lauf)

## Entscheidungen in Zug 0

Kurz, damit Implementierer und Reviewer den Grund kennen:

- **CORR-006: Deckel bei der Breite statt Fallback bei `Infinity`.** Der Befund nennt nur den denormalisierten Wert
  (`1e-320` → Kehrwert `Infinity`). Nachgerechnet am Code: auch `1e308` (größer als 1, kein Kehrwert) und `1e-308`
  (Kehrwert `1e308`) sind endlich, lassen aber `x * repeat` in `updateStrip()` überlaufen → `Infinity % 1` = `NaN` →
  Palettenindex `NaN` → schwarze Pixel. Eine reine `Number.isFinite`-Prüfung behöbe die Ursache nur halb. Der Deckel
  »höchstens eine Wiederholung pro physischem Pixel« (`Math.min(…, w)`) hält jede Zwischenrechnung endlich, ist fachlich
  begründet (ein Farbzyklus kann nicht kürzer als ein Pixel gezeichnet werden) und entspricht der ersten Option der
  Audit-Empfehlung (»auf einen endlichen Höchstwert klemmen«). Sichtbar ändert sich nur etwas für Werte über der
  Pixelbreite, die bisher Aliasing-Rauschen oder Schwarz ergaben.
- **TEST-002: `window.devicePixelRatio` im Test überschreiben, nicht Playwright-`deviceScaleFactor`.** Mit einem echten
  Skalierungsfaktor 2 liefern beide Messzweige wieder dieselbe Größe (Device-Pixel-Box 640×480 = Content-Box × 2) — der
  Test bliebe blind. Nur eine Ratio im Skript, die von der echten Rendering-Ratio (1) abweicht, trennt die Zweige:
  der richtige Zweig meldet 640×480, der falsche 320×240. Das ist die zweite Option der Empfehlung. In Zug 0 per
  Playwright-Chromium geprüft: `devicePixelRatio` ist eine eigene, konfigurierbare Accessor-Eigenschaft von `window`,
  `Object.defineProperty` überschreibt sie, das gesicherte Deskriptor-Objekt stellt sie wieder her, und Chromium füllt
  `devicePixelContentBoxSize` auch bei einer `content-box`-Beobachtung (320 bei überschriebener Ratio 2).
- **TYPES-002: benannter Typ statt `Record<string, number | string | null | undefined>`.** Die erste Option der
  Empfehlung passt nicht zu dem, was `parseMessageData()` bekommt: jede Nachricht an den Worker, also auch `canvas`
  (`OffscreenCanvas`), `isConnected` (boolean) und `resize` (Objekt). Deshalb `RainbowLineMessage` =
  `OffscreenDisplayMessage & RainbowLineAttributes`. Dass der engere Typ für niemanden breaking ist, steht bereits in
  »Entscheidungen« des Plans (0.5.0 ist unveröffentlicht).
- **TYPES-003: `@typedef {Object}` mit `@property`, Basistyp abgespalten.** Experiment mit dem Projekt-tsc (7.0.2) im
  Scratchpad: tsc 7 hängt die Beschreibung eines `@typedef` in **keiner** Form an den erzeugten `type` (weder davor,
  noch nach dem Tag, noch als `@description`), wohl aber jede `@property`-Beschreibung als Member-Kommentar, auch
  mehrzeilig, auch bei Namen mit Bindestrich (`[color-slice-width]` unquotiert; gequotet ist ein Parse-Fehler).
  `@property` wirkt nur bei `@typedef {Object}`; bei `@typedef {Record<…>}` wird es ignoriert. Deshalb bekommt
  `OffscreenDisplayMessage` einen Basistyp `OffscreenDisplayMessageProperties` mit den beschriebenen Eigenschaften, und
  die Intersektion mit `Record<string, unknown>` bleibt im eigentlichen Typ (ohne sie würde der all-optionale Typ zum
  »weak type« und Nachrichten mit eigenen Attributen einer Unterklasse abweisen). Die Erklärung auf Typebene steht
  zusätzlich im Klassenkommentar von `OffscreenWorkerDisplay` — Klassenkommentare übernimmt tsc 7.
- **NEW-2 und `rainbow-line.spec.js:59`: `expect.timeout` global auf 15 s.** Beide Fehlschläge sind `expect.poll`-
  Wartestellen mit dem Vorgabewert 5 s, die in Firefox unter Parallellast (Vitest-Browser und Playwright zugleich,
  Playwright `fullyParallel` mit halb so vielen Workern wie Kerne) nicht rechtzeitig grün werden: Worker-Start und
  Element-Screenshot (`readRow`) sind in Firefox unter Last langsam. Wiederholungen und Einzelläufe sind grün, ein
  logischer Wettlauf ist im Code nicht zu sehen (Nachrichtenfolge canvas → isConnected → resize ist geordnet). Global,
  nicht nur für Firefox: dieselbe Ursache trifft WebKit in CI, und in Chromium kostet ein höherer Deckel nichts, weil
  die Assertions zurückkehren, sobald der Zustand da ist.
- **Changelog: bestehende Einträge ergänzen, keine neuen Fixed-Zeilen für Fehler ohne Release.** 0.3.0 und 0.5.0
  sind unveröffentlicht (Entscheidung »Kein Versionssprung« im Plan). Die Typdeklarationen und das Weiterlaufen des
  Frame-Loops nach einem Fehler sind in diesen Versionen neu — die Fehlerflut und das `any` hat kein Release je gehabt.
  Die schwarze Linie bei extremen Wiederholungen hat dagegen schon 0.4.0 (Kehrwert per `w / (repeat * w)`); sie gehört
  in den bestehenden Fixed-Eintrag zu den Wertebereichen.
- **Vendortes Bundle neu kopieren.** `packages/astro-rainbow-line/rainbow-line-v0.5.0.js` ist bytegleich mit dem
  aktuellen `packages/rainbow-line/bundle.js`, und 999823e hat es bei der letzten Worker-Änderung mitgezogen. CORR-006
  und CORR-007 ändern Code, der in `bundle.js` landet (der Worker von offscreen-display ist dort eingebettet).
- **Modell mittlere Stufe, Effort medium.** Die Effort-Tabelle nennt für »berührt die öffentliche API« `high`. Hier
  steht jede API-Zeile wörtlich in diesem Plan, die Breaking-Frage ist entschieden, und `consumer.ts` sichert den
  veröffentlichten Typ ab; `high` auf einer so vorgeschriebenen Änderung lädt zum Umbauen ein, das hier niemand will.

## Vorgehen

Tests laufen gegen den Build: `pnpm nx test <projekt>` baut vorher selbst. Wo ein Schritt einen roten Lauf verlangt,
gehört dessen Ausgabe (die Zeilen mit dem Testnamen und der Assertion) in den Report.

### 1. TEST-003 — Testname mit Platzhalter

`packages/rainbow-line/test/rainbowLineBehaviour.js:199-200`: der Name von `test.each([...])` wird
`'accepts cycle-colors separated by commas, tabs and line breaks: %j'`. Sonst nichts; `%j` statt `%s`, weil die Werte
Tabs und Zeilenumbrüche enthalten, die erst als JSON lesbar im Testnamen stehen.

### 2. TEST-002 — Fallback-Test mit abweichender Ratio

`packages/offscreen-display/test/offscreen-display.test.js:269-285`, Testname bleibt. Neuer Körper:

```js
  test('measures the canvas in css pixels times devicePixelRatio where the device pixel box is not supported', async () => {
    const {observe} = ResizeObserver.prototype;
    ResizeObserver.prototype.observe = function (target, options) {
      if (options?.box === 'device-pixel-content-box') {
        throw new TypeError('device-pixel-content-box is not supported');
      }
      return observe.call(this, target, options);
    };
    // a ratio that differs from the one the page renders with: the device pixel box would still report 320x240,
    // only the content box times the ratio makes 640x480
    const devicePixelRatio = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    Object.defineProperty(window, 'devicePixelRatio', {configurable: true, get: () => 2});
    try {
      const display = mountDisplay();

      await expect
        .poll(() => display.eventsOf('resize').at(-1))
        .toEqual({event: 'resize', width: 640, height: 480, pixelRatio: 2});
    } finally {
      ResizeObserver.prototype.observe = observe;
      if (devicePixelRatio) {
        Object.defineProperty(window, 'devicePixelRatio', devicePixelRatio);
      } else {
        Reflect.deleteProperty(window, 'devicePixelRatio');
      }
    }
  });
```

`Reflect.deleteProperty` statt `delete`, damit Biome keinen Einwand hat; in Chromium ist `devicePixelRatio` eine
eigene Eigenschaft von `window`, der `else`-Zweig ist die Absicherung für Browser, die sie am Prototyp führen.

Gegenprobe (Mutationslauf, Pflicht): in `packages/offscreen-display/src/lib/main/OffscreenDisplay.js:127` die Bedingung
vorübergehend auf `if (entry.devicePixelContentBoxSize) {` ändern, `pnpm nx test offscreen-display` laufen lassen — der
Test muss rot werden (erwartet 640×480, bekommt 320×240). Danach die Änderung zurücknehmen und mit
`git diff --exit-code -- packages/offscreen-display/src/lib/main/OffscreenDisplay.js` belegen, dass die Datei
unverändert ist. Beides in den Report.

### 3. CORR-007 — wiederholte Frame-Fehler nur einmal melden

**Erst der Test, rot sehen, dann der Fix.**

a) Fixture `packages/offscreen-display/test/fixtures/test-display.worker.js`:
- neben `let throwInNextFrame = false;` eine Variable `let throwInEveryFrame = false;` (`false` oder die Fehlermeldung
  als String)
- in `onFrame`, direkt nach dem `if (throwInNextFrame) {…}`-Block:
  ```js
      if (throwInEveryFrame) {
        self.postMessage({event: 'failingFrame'});
        throw new Error(throwInEveryFrame);
      }
  ```
- im `message`-Listener, direkt nach dem `if (data.throwInNextFrame) {…}`-Block:
  ```js
    if ('throwInEveryFrame' in data) {
      throwInEveryFrame = data.throwInEveryFrame;
      return;
    }
  ```

b) Test in `packages/offscreen-display/test/offscreen-display.test.js`, direkt nach
`'keeps rendering frames after an onFrame listener threw'`:

```js
  test('reports an error that repeats in every frame once, until a frame runs without it', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);
    const failingFrames = () => display.eventsOf('failingFrame').length;

    display.worker.postMessage({throwInEveryFrame: 'boom in every frame'});
    await expect.poll(() => display.errors).toHaveLength(1);
    const failingFramesBefore = failingFrames();
    await expect.poll(failingFrames).toBeGreaterThan(failingFramesBefore + 5);
    expect(display.errors).toHaveLength(1);
    expect(display.errors[0]).toMatch(/boom in every frame/);

    // another error is reported at once, even while the series goes on
    display.worker.postMessage({throwInEveryFrame: 'another boom'});
    await expect.poll(() => display.errors).toHaveLength(2);
    expect(display.errors[1]).toMatch(/another boom/);

    // after a frame without an error, the same error opens a new series
    display.worker.postMessage({throwInEveryFrame: false});
    const framesBefore = display.frameCount();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(framesBefore + 2);
    display.worker.postMessage({throwInEveryFrame: 'another boom'});
    await expect.poll(() => display.errors).toHaveLength(3);
  });
```

`pnpm nx test offscreen-display` → dieser Test rot (mehr als ein Eintrag in `display.errors`). Ausgabe in den Report.

c) Fix in `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`. Zwei private Felder neben `#destroyed`:

```js
  // whether the last frame threw and what: an error that repeats frame after frame reaches the main thread only once
  #lastFrameFailed = false;

  /** @type {unknown} */
  #lastFrameError = undefined;
```

`#onFrame(now)` wird zu (der Block im `try` bleibt bis auf die neue letzte Zeile unverändert):

```js
  #onFrame(now) {
    try {
      // …unchanged: the if (this.ready && this.#hasSize) {…} block…
      this.#lastFrameFailed = false;
    } catch (error) {
      // the first error of a series reaches the main thread as an error event of the worker; the same error in the
      // following frames is dropped until a frame runs without an error, so a listener that fails in every frame
      // does not send an error event per frame. Errors count as the same when the main thread would read the same
      // message; other thrown values when they are the same value.
      const key = error instanceof Error ? `${error.name}: ${error.message}` : error;
      const repeated = this.#lastFrameFailed && Object.is(key, this.#lastFrameError);
      this.#lastFrameFailed = true;
      this.#lastFrameError = key;
      if (!repeated) throw error;
    } finally {
      // a throwing listener must not end the animation
      this.#requestAnimationFrame();
    }
  }
```

Bewusste Grenze, nicht nachbessern: verglichen wird nur mit dem Fehler des Vorframes. Zwei Fehler, die sich Frame um
Frame abwechseln, werden jedes Mal gemeldet — dafür hält der Loop keinen wachsenden Zustand.

d) Doku desselben Verhaltens, ohne Rückblick formuliert:
- `packages/offscreen-display/README.md:113`: der Satz »A throwing listener does not end the frame loop, the error
  arrives as an `error` event at the `Worker`.« wird zu »A throwing listener does not end the frame loop. Its error
  arrives as an `error` event at the `Worker`; the same error in the following frames arrives only once, until a frame
  runs without an error.«
- `CLAUDE.md:50`: »A throwing listener does not end the frame loop;« wird zu »A throwing listener does not end the
  frame loop, and an error that repeats frame after frame reaches the main thread only once, until a frame runs
  without an error;« (der Rest des Satzes bleibt).
- `packages/offscreen-display/CHANGELOG.md`, Abschnitt `[0.3.0]`, `### Fixed`: der Eintrag »an `onFrame` listener
  that threw ended the animation« wird zu »an `onFrame` listener that threw ended the animation; the loop goes on, and
  an error that repeats frame after frame reaches the main thread once, until a frame runs without an error«.

### 4. CORR-006 — Wiederholungen der Farben bei der Pixelbreite deckeln

**Erst der Test, rot sehen, dann der Fix.**

a) Test in `packages/rainbow-line/test/rainbowLineBehaviour.js`, direkt nach
`test.each(['0', '-2'])('falls back to one repetition for a cycle-colors-repeat of %s', …)`:

```js
    test.each(['1e-320', '1e308'])('draws the cycle-colors for a cycle-colors-repeat of %s', async (value) => {
      const line = mountRainbowLine({'cycle-colors': '#ff0000 #0000ff', 'cycle-colors-repeat': value});
      const row = await readDrawnRow(line);

      expect(row.every(isRedOrBlueMix)).toBe(true);
    });
```

`pnpm nx test rainbow-line` → beide Fälle rot, in beiden Varianten (`rainbow-line.test.js` und `bundle.test.js` teilen
diese Datei): die Linie bleibt schwarz, `readDrawnRow` läuft in den Poll-Timeout oder `isRedOrBlueMix` scheitert an
schwarzen Pixeln. Ausgabe in den Report. Der Test prüft bewusst nur »gezeichnet, nur die gegebenen Farben«, nicht die
konkrete Farbe — nach dem Fix ist die Linie einfarbig rot (jede Wiederholung trifft Palettenindex 0).

b) Fix in `packages/rainbow-line/src/RainbowLineWorkerDisplay.js:51-57`:

```js
/**
 * A cycle-colors-repeat below 1 counts as its reciprocal: 0.5 repeats the colors twice, 0.01 a hundred times.
 * A color cycle cannot be drawn shorter than one physical pixel, so the repetitions end at the canvas width — which
 * also keeps the reciprocal of a denormalized number (Infinity) and huge values out of the arithmetic of the strip.
 * @param {number} value
 * @param {number} width the canvas width in physical pixels
 */
function effectiveRepeat(value, width) {
  return Math.min(value < 1 ? 1 / value : value, width);
}
```

und in `onFrame` (Zeile 73): `const repeat = cycleColors === undefined ? 1 : effectiveRepeat(cycleColorsRepeat, w);`

c) Doku:
- `packages/rainbow-line/README.md:57`, Zeile `cycle-colors-repeat`: nach »…`0.01` a hundred times.« den Satz »The
  colors repeat at most once per device pixel.« einfügen, vor »Has no effect on the rainbow.«
- `packages/rainbow-line/CHANGELOG.md`, Abschnitt `[0.5.0]`, `### Fixed`: der Eintrag »a `color-slice-width`,
  `slice-cycle-time` or `cycle-colors-repeat` that is `0`, negative or not a number uses the default; slices are at
  least one device pixel wide, so every value keeps the line animating« wird zu »… uses the default; slices are at
  least one device pixel wide, so every value keeps the line animating, and the `cycle-colors` repeat at most once per
  device pixel, so no value leaves the line black«.

### 5. TYPES-003 — Beschreibungen, die in der `.d.ts` ankommen

`packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:4-24`: die beiden `@typedef`-Kommentare werden
durch diese drei ersetzt (Wortlaut übernehmen, Zeilen ≤ 130 Zeichen):

```js
/**
 * The properties of the messages `OffscreenDisplay` sends to its worker.
 * @typedef {Object} OffscreenDisplayMessageProperties
 * @property {OffscreenCanvas} [canvas] the canvas of the element, transferred once in the first message
 * @property {Record<string, unknown>} [contextAttributes] the attributes for `getContext()`, sent together with `canvas`
 * @property {boolean} [isConnected] whether the element is connected to the document; frames only run while it is
 * @property {{width: number, height: number, pixelRatio?: number}} [resize] the size of the canvas in physical pixels
 *   and their ratio to css pixels
 */

/**
 * A message from the main thread, as `OffscreenDisplay` sends it: first `canvas` together with `contextAttributes`
 * and the attributes of `getInitialWorkerAttributes()`, later `isConnected` and `resize`. Subclasses may add more.
 * @typedef {OffscreenDisplayMessageProperties & Record<string, unknown>} OffscreenDisplayMessage
 */

/**
 * The events of an `OffscreenWorkerDisplay` and the arguments their listeners receive, as an event map for
 * `@spearwolf/eventize` — for example `EventListenerMethods<OffscreenWorkerDisplayEvents>`.
 * @typedef {Object} OffscreenWorkerDisplayEvents
 * @property {[display: OffscreenWorkerDisplay, contextAttributes: Record<string, unknown> | undefined]} onCanvas the
 *   canvas has arrived, with the attributes for `getContext()`; retained
 * @property {[display: OffscreenWorkerDisplay]} onInit the canvas is there and the element is connected; retained
 * @property {[display: OffscreenWorkerDisplay]} onResize the size or the pixel ratio has changed; retained
 * @property {[display: OffscreenWorkerDisplay]} onFrame once per animation frame, only while the element is connected,
 *   from the first size on and while the canvas is larger than 0
 */
```

Direkt über `export class OffscreenWorkerDisplay {` ein Klassenkommentar:

```js
/**
 * The worker side of an `OffscreenDisplay`: hand it every message from the main thread with `parseMessageData()` and
 * listen to its events with `on()` from `@spearwolf/eventize`; `OffscreenWorkerDisplayEvents` lists them together with
 * the arguments of their listeners.
 */
```

Und am `parseMessageData`-Kommentar (Zeile 185-187) die Beschreibung ergänzen:
`@param {OffscreenDisplayMessage | null | undefined} data a message from the main thread; data that is not an object is ignored`
(bei Bedarf nach `data` umbrechen, Folgezeile mit zwei Leerzeichen eingerückt).

Prüfung: `pnpm nx build offscreen-display`, dann in
`packages/offscreen-display/dist/types/lib/worker/OffscreenWorkerDisplay.d.ts` nachsehen, dass
`export type OffscreenDisplayMessageProperties`, `export type OffscreenDisplayMessage` und
`export type OffscreenWorkerDisplayEvents` existieren, jedes Member der beiden Objekttypen einen `/** … */`-Kommentar
trägt und `export declare class OffscreenWorkerDisplay` den Klassenkommentar direkt darüber hat. Den Ausschnitt in
den Report — `dist/` ist nicht versioniert, der Reviewer sieht ihn sonst nicht.

`packages/offscreen-display/CHANGELOG.md`, `[0.3.0]`, `### Added`, erster Eintrag: nach »…`OffscreenDisplayMessage`
the messages from the main thread« anhängen: », with their properties in `OffscreenDisplayMessageProperties`; every
event and every message property carries a description«.

### 6. TYPES-002 — benannter Nachrichtentyp für `parseMessageData()`

**Erst die Typ-Probe, rot sehen, dann der Fix.**

a) `e2e/types/consumer.ts`, am Dateiende nach `parseMessageData({'cycle-colors': 'red blue'});`:

```ts
// @ts-expect-error cycle-direction is 1 (left) or -1 (right)
parseMessageData({'cycle-direction': 'left'});
```

`pnpm nx run e2e:e2e --skip-nx-cache -- npm-packages.spec.js` (baut die `.npm-pkg/`-Verzeichnisse über
`^buildNpmPkg`; geht die Argumentweitergabe nicht, `pnpm e2e`) → der Consumer-Typcheck in `npm-packages.spec.js` ist
rot mit TS2578 »Unused '@ts-expect-error' directive«, weil der veröffentlichte Typ noch `Record<string, any>` ist.
Ausgabe in den Report.

b) Fix in `packages/rainbow-line/src/RainbowLineWorkerDisplay.js`:
- Zeile 2 wird `/** @import {OffscreenDisplayMessage, OffscreenWorkerDisplayEvents} from '@spearwolf/offscreen-display/worker.js' */`
- nach dem Import-Block (vor `const display = …`) diese zwei Typen:

```js
/**
 * The attributes of `<rainbow-line>` as `RainbowLineElement` sends them to its worker. The numeric ones may also be
 * strings; a value that is not a positive number uses the default.
 * @typedef {Object} RainbowLineAttributes
 * @property {number | string} [color-slice-width] the width of a color slice in css pixels; a value below `1` is a
 *   fraction of the line width
 * @property {number | string} [slice-cycle-time] the seconds for the colors to cycle once through a slice
 * @property {1 | -1} [cycle-direction] `1` moves the colors to the left, `-1` to the right
 * @property {string} [cycle-colors] a list of css colors, separated by whitespace or commas; without a valid color the
 *   line shows the rainbow
 * @property {number | string} [cycle-colors-repeat] how often the `cycle-colors` repeat across the width; a value
 *   below `1` counts as its reciprocal
 */

/**
 * A message to the worker of `<rainbow-line>`: the messages of `OffscreenDisplay` together with the attributes of the
 * element.
 * @typedef {OffscreenDisplayMessage & RainbowLineAttributes} RainbowLineMessage
 */
```

- der Kommentar an `parseMessageData` (Zeile 91-93) wird
  `@param {RainbowLineMessage | null | undefined} data a message from the main thread; data that is not an object is ignored`.

Die Namen mit Bindestrich stehen in `@property` **ohne** Anführungszeichen in eckigen Klammern — gequotet bricht tsc 7
mit TS1003 ab (im Scratchpad ausprobiert).

Prüfung: `pnpm typecheck` grün; `pnpm nx build rainbow-line`, dann in
`packages/rainbow-line/dist/types/RainbowLineWorkerDisplay.d.ts` nachsehen, dass
`parseMessageData(data: RainbowLineMessage | null | undefined)` dort steht und `RainbowLineAttributes` die fünf
Member mit Kommentar trägt; Ausschnitt in den Report. Dann der Lauf aus a) grün.

`packages/rainbow-line/CHANGELOG.md`, `[0.5.0]`, `### Added`: an »type declarations for the source modules
`./RainbowLineElement.js` and `./RainbowLineWorkerDisplay.js`« anhängen: »; `parseMessageData()` takes a
`RainbowLineMessage`, whose `RainbowLineAttributes` describe the attributes the element sends to its worker«.

### 7. Vendortes Bundle erneuern

Nach den Schritten 3–6 (sie ändern Code, der in `bundle.js` landet): `pnpm nx build rainbow-line`, dann
`cp packages/rainbow-line/bundle.js packages/astro-rainbow-line/rainbow-line-v0.5.0.js`. Mit
`head -5 packages/astro-rainbow-line/rainbow-line-v0.5.0.js` prüfen, dass der Banner `@version 0.5.0+…` trägt. Die
Datei nicht von Hand ändern; Biome schließt sie aus.

### 8. NEW-2 und `rainbow-line.spec.js:59` — Wartezeit der e2e-Assertions

`e2e/playwright.config.js`, in `defineConfig({…})` nach `reporter: …`:

```js
  // Firefox starts workers and takes element screenshots slowly while the machine is busy (the vitest browser tests
  // and both playwright projects running at once); the assertions wait for a state that arrives, so they get more time
  expect: {timeout: 15_000},
```

Die Specs selbst bleiben unverändert — kein `timeout` an einzelnen `expect.poll`-Aufrufen.

Beleg (es gibt keinen deterministisch roten Lauf, der Fehler ist lastabhängig): nach dem Fix einmal unter der
Bedingung, unter der er beobachtet wurde, `pnpm nx run-many -t build test e2e --skip-nx-cache`. Ergebnis in den
Report. Scheitert dabei eine der beiden Wartestellen trotz 15 s erneut, ist das kein Timing-Problem: dann Status
`FERTIG_MIT_VORBEHALT`, mit Testname, Projekt und dem Pfad der Trace-Datei aus `e2e/test-results/`, und nichts
weiter daran ändern.

### 9. Abschluss des Implementierers

`pnpm verify` einmal komplett, Ergebnis in den Report. Arbeitsbaum: nur die Dateien aus der Liste oben geändert
(`git status --short`, Plan und `docs/remediation/` ausgenommen).

## Urteil des Reviewers

Je Finding (Fundstellen im Stand cadbd10):

- CORR-007 behoben — `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:77-80`, `:185-196`; Test
  `packages/offscreen-display/test/offscreen-display.test.js:253`; Doku `README.md:113`, `CHANGELOG.md:34`, `CLAUDE.md:50`
- CORR-006 behoben — `packages/rainbow-line/src/RainbowLineWorkerDisplay.js:78-80`, `:96`; Test
  `packages/rainbow-line/test/rainbowLineBehaviour.js:199`; Doku `README.md:57`, `CHANGELOG.md:33`
- TYPES-002 behoben — `RainbowLineWorkerDisplay.js:15-29`, `:115`; `dist/types/RainbowLineWorkerDisplay.d.ts` trägt
  `parseMessageData(data: RainbowLineMessage | null | undefined)`; Typprobe `e2e/types/consumer.ts:62-63`
- TYPES-003 behoben — `OffscreenWorkerDisplay.js:6`, `:17`, `:20ff.`, Klassenkommentar über `:37`; jedes Member der
  drei Objekttypen und die Klasse tragen ihren Kommentar in der erzeugten `.d.ts`
- TEST-002 behoben — `offscreen-display.test.js:305`, `:311`; Mutationslauf gegen `OffscreenDisplay.js:127` rot
- TEST-003 behoben — `rainbowLineBehaviour.js:207` (`: %j`)
- NEW-2 behoben, soweit lastabhängig belegbar — `e2e/playwright.config.js:19`
- Queue-Eintrag `e2e/tests/rainbow-line.spec.js:59` behoben — dieselbe globale Einstellung

Kleine Befunde (keine Runde):

- `OffscreenWorkerDisplay.js:24`: `onCanvas the` bricht vor »canvas« um, die `.d.ts` trägt »the⏎canvas has arrived …«;
  schöner wäre der Umbruch vor »the«.
- `dist/types/lib/worker/OffscreenWorkerDisplay.d.ts`: tsc 7 gibt die drei `@typedef`-Blöcke zusätzlich als
  freistehende Kommentare aus — Verhalten von tsc, nicht dieses Pakets.
- `offscreen-display.test.js:253`: die Drosselung ist nur für `Error`-Instanzen getestet, der `Object.is`-Zweig für
  andere geworfene Werte (`OffscreenWorkerDisplay.js:191`) nicht.
- `e2e/playwright.config.js:17-18`: der Kommentar begründet das globale Timeout nur mit Firefox, nicht damit, dass
  WebKit in CI dieselbe Ursache trifft.

## Hinweise für Zug 5

- In »Offene Befunde« des Plans den Eintrag `e2e/tests/rainbow-line.spec.js:59` nach dem Commit auf `[x]` setzen, mit
  dem Hash dieses Pakets.
- `Schnittstellen:` für den Plan: neue Typ-Exporte `OffscreenDisplayMessageProperties`
  (`@spearwolf/offscreen-display/worker.js`), `RainbowLineAttributes` und `RainbowLineMessage`
  (`rainbow-line/RainbowLineWorkerDisplay.js`) · `parseMessageData(data: RainbowLineMessage | null | undefined)` statt
  `Record<string, any>` · Playwright `expect.timeout` 15 s.

## Findings im Volltext

**CORR-007 · info · packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:152** — Ein Listener, der in
jedem Frame wirft, erzeugt rund 60 error-Events pro Sekunde
Der Frame-Loop fordert den nächsten Frame im `finally` an und läuft deshalb nach einer Exception im
`onFrame`-Listener weiter. Wirft der Listener dauerhaft, meldet der Main-Thread jeden Frame ein `error`-Event. So
gewollt; die Wertebereichsprüfungen von rainbow-line nehmen die bekannten Auslöser weg. Kleinbefund des Reviewers
ohne Nachrunde.
Empfehlung: Wiederholte identische Fehler drosseln oder nach N aufeinanderfolgenden Fehlern den Loop anhalten und
einmal melden. — Entschieden im Plan (»Frame-Loop drosselt wiederholte Listener-Fehler«): drosseln, Loop läuft weiter.

**CORR-006 · low · packages/rainbow-line/src/RainbowLineWorkerDisplay.js:55** — Denormalisierte Werte für
cycle-colors-repeat ergeben einen unendlichen Kehrwert
`effectiveRepeat()` rechnet für Werte unter 1 den Kehrwert. Ein positiver, denormalisierter Wert wie
`cycle-colors-repeat="1e-320"` besteht die Positivprüfung und ergibt `Infinity`; das Bild bleibt schwarz stehen. Kein
Hänger, kein Absturz. Kleinbefund des Reviewers ohne Nachrunde.
Empfehlung: Das Ergebnis von `effectiveRepeat()` auf einen endlichen Höchstwert klemmen oder nicht endliche
Ergebnisse auf den Default zurückfallen lassen.

**TYPES-002 · low · packages/rainbow-line/src/RainbowLineWorkerDisplay.js:92** — parseMessageData veröffentlicht
Record<string, any> in der Typdeklaration
Der Parameter von `parseMessageData()` ist als `Record<string, any> | null | undefined` annotiert und landet so in der
veröffentlichten `.d.ts` des Quell-Subpfads `./RainbowLineWorkerDisplay.js`. Kleinbefund des Reviewers ohne Nachrunde.
Empfehlung: Auf `Record<string, number | string | null | undefined>` oder einen benannten Nachrichtentyp einengen.

**TYPES-003 · info · packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:7** (auch `:18`) —
Beschreibungen der @typedef fehlen in der erzeugten .d.ts
TypeScript 7 hängt die Beschreibungstexte der beiden `@typedef` (`OffscreenDisplayMessage`,
`OffscreenWorkerDisplayEvents`) nicht an die erzeugten Typen; im Editor-Hover fehlt die Erklärung. Rein kosmetisch.
Kleinbefund des Reviewers ohne Nachrunde.
Empfehlung: Die Beschreibung als Kommentar direkt an die Typdefinition bzw. die einzelnen Eigenschaften setzen und die
erzeugte `.d.ts` prüfen.

**TEST-002 · low · packages/offscreen-display/test/offscreen-display.test.js:269** — Fallback-Test der Canvas-Größe
unterscheidet bei devicePixelRatio 1 die beiden Messzweige nicht
Der Test »measures the canvas in css pixels times devicePixelRatio where the device pixel box is not supported« läuft
mit devicePixelRatio 1. Content-Box × Ratio und Device-Pixel-Box liefern dann dieselbe Größe, der Test würde also
nicht rot, wenn der Code den Zweig wieder am falschen Merkmal festmachte. Kleinbefund des Reviewers ohne Nachrunde.
Empfehlung: Den Test mit einer emulierten Ratio ungleich 1 fahren (etwa per Playwright-deviceScaleFactor im
Vitest-Browser-Provider) oder `devicePixelRatio` im Test überschreiben und die erwartete Größe daraus ableiten.

**TEST-003 · low · packages/rainbow-line/test/rainbowLineBehaviour.js:199** — test.each ohne Platzhalter erzeugt vier
gleichnamige Tests
»accepts cycle-colors separated by commas, tabs and line breaks« läuft über vier Werte, der Name enthält keinen
Platzhalter. Im Report stehen vier identische Namen; welcher Fall rot ist, zeigt erst die Fehlermeldung. Kleinbefund
des Reviewers ohne Nachrunde.
Empfehlung: `: %j` an den Testnamen hängen.

**NEW-2 · low · e2e/tests/astro-rainbow-line.spec.js:38** — sporadischer Firefox-Timeout (aus der Baseline, nicht im
Audit)
»passes its props through to the element« läuft in Firefox gelegentlich in den 5-s-Timeout von `expect.poll`,
beobachtet unter `pnpm nx run-many -t build test e2e` (Vitest-Browser und Playwright parallel), in 5 Einzelläufen von
`pnpm e2e` nicht. nx meldet den Task als flaky.

**Queue-Eintrag · e2e/tests/rainbow-line.spec.js:59** — sporadischer Firefox-Timeout unter Parallellast, gleiche
Ursache wie NEW-2 (gesehen in Paket 1, Verify des Implementierers; Wiederholung grün). Betrifft die
`expect.poll(() => page.workers().length)`-Wartestellen in »terminates the workers of removed elements«.
