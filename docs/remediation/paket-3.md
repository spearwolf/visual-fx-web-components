# Paket 3 — rainbow-line: Attribute validieren, Zeichenroutine umbauen, Astro-Skript einmal laden

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: CORR-001 (high), CORR-003 (medium), CORR-004 (medium), PERF-001 (medium), READ-001 (low), CONS-001 (low),
  TEST-001 (medium, Teil: Negativ-Tests für die Wertebereiche aus CORR-001 und CORR-003, Test für einen Laufzeitwechsel
  von `cycle-colors-repeat`)
- Ziel: Kein Attributwert bringt den Worker zum Hängen oder Abstürzen, jede Frame zeichnet mit zwei `drawImage` aus einem
  vorgerenderten Streifen, und `<RainbowLine>` gibt seinen Skript-Tag einmal pro Seite aus.
- Modell: stärkste Stufe — Umbau der Zeichenroutine mit drei Canvases und pixelgenauer Abtastung, die in Chromium,
  Firefox und WebKit gleich aussehen muss, dazu zwei Packages, e2e und ein neues Modul in den veröffentlichten Quellen
- Effort: medium — der Plan legt Namen, Formeln und Testfälle fest; mehr Effort lädt nur zum Verbessern jenseits des Plans ein
- Dateien:
  - neu: `packages/rainbow-line/src/attributes.js`
  - `packages/rainbow-line/src/RainbowLineElement.js`
  - `packages/rainbow-line/src/RainbowLineWorkerDisplay.js`
  - `packages/rainbow-line/scripts/buildPackage.mjs`
  - `packages/rainbow-line/test/rainbowLineBehaviour.js`
  - `packages/rainbow-line/README.md`, `packages/rainbow-line/CHANGELOG.md`
  - `packages/astro-rainbow-line/RainbowLine.astro`
  - `packages/astro-rainbow-line/test/RainbowLine.test.js`
  - `packages/astro-rainbow-line/README.md`, `packages/astro-rainbow-line/CHANGELOG.md`
  - `e2e/tests/astro-rainbow-line.spec.js`, `e2e/tests/npm-packages.spec.js`
- Verify: `E2E_SKIP_WEBKIT=1 pnpm verify`
- Commit: `rainbow-line: validate attributes, draw frames from a pre-rendered strip, emit the astro script tag once`

## Entscheidungen dieses Zugs 0

Getroffen vom Runner, jeweils mit Grund; keine davon kehrt eine Zeile aus »Entscheidungen« im Plan um.

1. **Die Farbscheiben bleiben an ihrem Platz, nur ihre Farben laufen durch.** Die Audit-Empfehlung verschiebt einen fertig
   in Scheiben gerenderten Streifen um `dx = (t mod 1) * w`; damit wandern die Scheibenkanten mit, und das Element sieht
   anders aus als heute. Heute steht jede Scheibe fest und wechselt ihre Farbe (»slice-cycle-time«, Farbzyklus), und das
   ist in Tests festgeschrieben: `colorRuns(row) === 360 / 10` bzw. `=== 360 / 60` in `rainbowLineBehaviour.js`,
   `e2e/tests/rainbow-line.spec.js`, `e2e/tests/astro-rainbow-line.spec.js` und `e2e/tests/rainbow-line-hidpi.spec.js`
   zählen exakt, ein wandernder Streifen ergäbe fast immer eine Scheibe mehr. Ein Performance-Umbau ändert das Bild nicht.
   Das Ziel aus dem Plan bleibt wörtlich erfüllt: zwei `drawImage` je Frame aus einem vorgerenderten Streifen — der erste
   tastet den Streifen in eine Zwischen-Canvas mit einem Pixel je Scheibe ab, der zweite skaliert diese Pixel ohne
   Glättung auf Scheibenbreite hoch (Schritt 5).
2. **Die Farbe einer Scheibe ist die an ihrer Mitte**, nicht mehr die an ihrer linken Kante. Die Abtastung per
   `drawImage` trifft Pixelmitten; der Unterschied ist ein konstanter Phasenversatz von einer halben Scheibe und nicht
   sichtbar.
3. **Der Regenbogen wird eine Farbpalette wie `cycle-colors`**: ein linearer Verlauf durch
   `#f00 #ff0 #0f0 #0ff #00f #f0f` (zurück zu `#f00`) ist in RGB exakt der Farbkreis `hsl(h, 100%, 50%)`. Damit gibt es
   einen Zeichenpfad statt zwei; `cycle-colors-repeat` wirkt im Regenbogen-Modus weiterhin nicht (Wiederholung 1).
4. **`cycle-colors` wird mit einem Klammer-bewussten Tokenizer zerlegt, nicht mit `split(/[\s,]+/)`.** Die Empfehlung des
   Audits zerlegt `rgb(255, 0, 0)` in `rgb(255`, `0`, `0)`; das funktioniert heute und muss weiter funktionieren.
5. **Ungültige oder entfernte Zahlenattribute ergeben den Default, auf beiden Seiten.** Die Empfehlung (»ungültige Werte
   gar nicht erst senden«) ließe den Worker beim alten Wert, während derselbe Attributwert beim ersten Verbinden den
   Default ergibt — das Bild hinge von der Vorgeschichte ab. Mit »ungültig → Default« hängt es nur vom aktuellen Attribut
   ab, und `removeAttribute('color-slice-width')` setzt die Scheibenbreite zurück (heute wird das Entfernen ignoriert,
   `parseFloat(null)` ist `NaN`; gleiche Ursache wie CORR-001, deshalb hier).
6. **Defaults und Zahlenprüfung liegen in einem gemeinsamen Modul `src/attributes.js`**, das Element und Worker
   importieren — »dieselben Schranken auf beiden Seiten« ohne zweite Kopie. Weil `./RainbowLineElement.js` und
   `./RainbowLineWorkerDisplay.js` als Quell-Subpfade veröffentlicht werden (Entscheidung DEP-001), muss
   `src/attributes.js` ins `.npm-pkg/`; ein neuer e2e-Test prüft, dass jede relative Import-Quelle der veröffentlichten
   Quelldateien mit veröffentlicht wird.
7. **Die Attribut-Tabelle im rainbow-line-README entsteht in diesem Paket** (aus DX-001, Paket 4, hierher gezogen): die
   Wertebereiche, die Farbsyntax und die Kehrwert-Semantik legt dieses Paket fest, READ-001 verlangt die Doku ohnehin,
   und eine README, die ungültige Werte nicht erklärt, wäre nach diesem Paket falsch.
8. **CONS-001 über ein `Set` in `Astro.locals`.** `Astro.locals` lebt genau so lange wie das Rendern einer Seite; die
   Container-API reicht ein übergebenes `locals`-Objekt unverändert durch (`astro/dist/container/index.js`:
   `state.locals = options?.locals ?? {}`), dadurch ist das auch per Unit-Test prüfbar. Der Fallback für `BASE_URL`
   wird `'/'`.

## Vorgehen

Arbeitsverzeichnis ist das Repo. Alle neuen Testnamen, Kommentare, README- und Changelog-Texte auf Englisch, ohne
Finding-IDs und ohne Rückblick auf den Vorzustand (Abschnitt »Konventionen« im Plan-Kopf). Code-Stil nach `biome.json`.

### Schritt 1 — Regressionstests zuerst, gegen den unveränderten Code

**a) `packages/rainbow-line/test/rainbowLineBehaviour.js`** — in `describeRainbowLine()` ergänzen (läuft für beide
Builds). Zwei lokale Helfer in dieser Datei, nicht in `testing/pixels.js`:

- `colorEdges(row)` — die Indizes `i >= 1`, an denen `row[i]` sich in r, g oder b von `row[i - 1]` unterscheidet.
- `redBlueCrossings(row)` — wie oft das Vorzeichen von `r - b` entlang der Zeile wechselt; Pixel mit `r === b` zählen
  nicht und unterbrechen nichts.

Die neuen Tests, jeweils mit `mountRainbowLine(...)` (360 px breit) und `readDrawnRow`/`readRow` wie die bestehenden:

| Testname | Aufbau | Erwartung | vor dem Fix |
| --- | --- | --- | --- |
| `falls back to 10px slices for a color-slice-width of %s` (`test.each(['0', '-10'])`) | `{'color-slice-width': v}` | `colorRuns(row) === WIDTH / 10`, danach `expect.poll(() => readRow(line)).not.toEqual(row)` | beide rot (Endlosschleife im Worker, nichts gezeichnet) |
| `draws slices of at least one pixel for a color-slice-width that rounds to zero` | `{'color-slice-width': '0.001'}` | `colorRuns(row) > WIDTH / 2`, und es animiert | rot |
| `falls back to the default cycle time for a slice-cycle-time of %s` (`test.each(['0', '-3'])`) | `{'slice-cycle-time': v}` | `hueBuckets(row).size >= 10`, und es animiert | `'0'` rot (`hsl(NaN…)`, alles schwarz); `'-3'` grün (Bereichsabdeckung) |
| `falls back to one repetition for a cycle-colors-repeat of %s` (`test.each(['0', '-2'])`) | `{'cycle-colors': '#ff0000 #0000ff', 'cycle-colors-repeat': v}` | `row.every(isRedOrBlueMix)`, ein Pixel mit `r > 200 && b < 60`, eines mit `b > 200 && r < 60` | `'0'` rot; `'-2'` grün |
| `accepts cycle-colors separated by commas, tabs and line breaks` (`test.each(['red, blue', 'red,blue', '#ff0000\t#0000ff', '#ff0000\n  #0000ff'])`) | `{'cycle-colors': v}` | wie die Zeile darüber (rot/blau, beide Enden vorhanden) | alle vier rot |
| `keeps css color functions in cycle-colors together` | `{'cycle-colors': 'rgb(255, 0, 0) rgb(0 0 255)'}` | wie oben | grün — Wächter gegen ein naives Split |
| `leaves out invalid colors of cycle-colors` | `{'cycle-colors': '#ff0000 notacolor #0000ff'}` | wie oben | rot |
| `shows the rainbow when cycle-colors has no valid color` | `{'cycle-colors': 'notacolor alsonotacolor'}` | `hueBuckets(row).size >= 10` | rot |
| `applies a cycle-colors-repeat that changes after the element has been connected` | `{'cycle-colors': '#ff0000 #0000ff', 'color-slice-width': '1'}`; `readDrawnRow`, dann `line.setAttribute('cycle-colors-repeat', '3')` | vorher `expect.poll(... redBlueCrossings(row)).toBeLessThanOrEqual(2)`, danach `expect.poll(...).toBeGreaterThanOrEqual(5)` | rot (Attribut nicht beobachtet) |
| `sets a numeric attribute back to its default when it is removed or out of range` | `{'color-slice-width': '60'}` | Runs `6`; `removeAttribute('color-slice-width')` → per `expect.poll` Runs `36`; `setAttribute(…, '60')` → `6`; `setAttribute(…, '0')` → `36` | rot (Entfernen wird ignoriert, `'0'` hängt den Worker) |
| `keeps the color slices in place while their colors cycle` | `{'color-slice-width': '60'}` | `colorEdges(row)` ist `[60, 120, 180, 240, 300]`; dann per `expect.poll` eine zweite, andere Zeile lesen, auch deren `colorEdges` ist `[60, 120, 180, 240, 300]` | grün — Wächter für Schritt 5 |

`WIDTH / 10` ist 36. Ein Worker, der in der Endlosschleife hängt, wird vom bestehenden `afterEach` beendet
(`line.remove()` → `dispose()` einen Frame später → `terminate()` wirkt auch auf einen blockierten Worker); der rote Lauf
endet also mit Timeouts der `expect.poll`, nicht mit einer hängenden Suite.

**b) `packages/astro-rainbow-line/test/RainbowLine.test.js`** — neuer Test
`renders the script tag only once per page`: ein gemeinsames `const locals = {}`, zweimal
`container.renderToString(RainbowLine, {locals})`; im ersten HTML genau ein `<script …src=…>`, im zweiten keiner. Vor
dem Fix rot.

**c) `e2e/tests/astro-rainbow-line.spec.js`** — neuer Test
`loads the rainbow-line script with a single script tag`: `await page.goto('/astro/')`, dann
`await expect(page.locator('script[src*="/js/rainbow-line-v"]')).toHaveCount(1)`. Die Seite
`e2e/src/pages/index.astro` hat drei `<RainbowLine>`; vor dem Fix rot (3).

**Rote Läufe** mit `pnpm nx test rainbow-line`, `pnpm nx test astro-rainbow-line` und
`E2E_SKIP_WEBKIT=1 pnpm nx e2e e2e` (der e2e-Lauf baut vorher selbst, was er braucht). Welche Tests rot waren, mit der
Ausgabe, gehört in den Report; die in der Tabelle als grün markierten Wächter müssen dabei grün sein.

### Schritt 2 — `packages/rainbow-line/src/attributes.js` (neu)

Ein kurzer Kopfkommentar: Defaults und Wertebereiche der Zahlenattribute, geteilt von Element und Worker, damit beide
Seiten auf dieselben Werte zurückfallen. Exporte:

```js
export const DEFAULT_COLOR_SLICE_WIDTH = 10;
export const DEFAULT_SLICE_CYCLE_TIME = 7;
export const DEFAULT_CYCLE_COLORS_REPEAT = 1;

/**
 * @param {number | string | null | undefined} value a number, or the value of an attribute
 * @param {number} defaultValue
 * @returns {number} the value if it is a finite number above 0, otherwise the default
 */
export function toPositiveNumber(value, defaultValue) { … }
```

Implementierung: `const number = typeof value === 'number' ? value : parseFloat(value ?? '');` und
`return Number.isFinite(number) && number > 0 ? number : defaultValue;`. `pnpm typecheck` muss grün bleiben (die Datei
liegt unter `packages/*/src/`, also im Check).

### Schritt 3 — `packages/rainbow-line/src/RainbowLineElement.js`

- `static observedAttributes` um `'cycle-colors-repeat'` ergänzen (fünf Namen).
- Eine Modulfunktion `toWorkerValue(name, value)` für beide Wege zum Worker: `'cycle-direction'` →
  `toCycleDirection(value)`, `'cycle-colors'` → `toCycleColors(value)`, die drei Zahlen →
  `toPositiveNumber(value, <Default aus attributes.js>)`. `toCycleDirection(null)` ergibt bereits `-1` (rechts),
  `toCycleColors(null)` bereits `undefined`; beide Helfer bleiben in dieser Datei.
- `getInitialWorkerAttributes()` liefert für jeden der fünf Namen `toWorkerValue(name, this.getAttribute(name))`.
  `asNumberValue()` wird hier nicht mehr benutzt (es lässt `0` und negative Werte durch); die Methode selbst gehört
  `OffscreenDisplay` und bleibt unangetastet.
- `attributeChangedCallback(name, _oldValue, newValue)`: ohne Worker `return`, sonst
  `this.worker.postMessage({[name]: toWorkerValue(name, newValue)})`. Die `typeof`/`NaN`-Prüfungen entfallen, ebenso
  das auskommentierte `// console.log(...)`.

### Schritt 4 — Attributwerte im Worker (`RainbowLineWorkerDisplay.js`)

Der Export `parseMessageData(data)` bleibt mit dieser Signatur (öffentlicher Quell-Subpfad). Nach
`display.parseMessageData(data)`:

- `color-slice-width`, `slice-cycle-time`, `cycle-colors-repeat` → `toPositiveNumber(data[name], DEFAULT_…)`; die
  Modulvariablen starten mit denselben Defaults aus `attributes.js`.
- `cycle-direction` → `data['cycle-direction'] === 1 ? 1 : -1`.
- `cycle-colors` → `setCycleColors(data['cycle-colors'])` (Schritt 5a).

### Schritt 5 — Farbliste, Palette, Streifen und Frame (`RainbowLineWorkerDisplay.js`)

Die bisherigen `GRADIENT_RESOLUTION`, `gradientCanvas`, `gradientCtx`, `gradientImageData`, `getGradientColor()` und
`createLinearGradientImage()` entfallen. Alle Hilfs-Canvases werden beim ersten Gebrauch angelegt, nicht beim Import
des Moduls.

**a) Farbliste.**

- `splitColorList(value)`: läuft Zeichen für Zeichen über den String, zählt die Klammertiefe (`(` +1, `)` −1, nie
  unter 0), trennt bei Tiefe 0 an Whitespace (`/\s/`) und an `,`, verwirft leere Tokens. Ergebnis für
  `'rgb(255, 0, 0), blue'` ist `['rgb(255, 0, 0)', 'blue']`. Kein `toLowerCase()` — Canvas liest Farbnamen und Hex
  ohne Rücksicht auf Groß-/Kleinschreibung.
- `isValidColor(color)`: `try { paletteCtx.createLinearGradient(0, 0, 1, 0).addColorStop(0, color); return true } catch { return false }`.
- `setCycleColors(value)`: ist `value` kein String, dann `cycleColors = undefined`. Sonst die Tokens prüfen; für jedes
  ungültige `console.warn(`<rainbow-line> cycle-colors: skipping the invalid color "${token}"`)`. Bleibt keine gültige
  Farbe übrig: `console.warn(`<rainbow-line> cycle-colors: no valid color in "${value}", showing the rainbow`)` und
  `cycleColors = undefined`. Sonst `cycleColors = <gültige Farben>`. In jedem Fall `paletteData = null`, damit die
  Palette beim nächsten Frame neu entsteht.

**b) Palette** — `PALETTE_SIZE = 1024`, `RAINBOW_COLORS = ['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f']`.
`renderPalette(colors)` füllt `palette` (`OffscreenCanvas(PALETTE_SIZE, 1)`) mit
`paletteCtx.createLinearGradient(0, 0, PALETTE_SIZE, 0)`, Stopps wie bisher: Farbe `i` bei `i / colors.length`, dazu
`colors[0]` bei `1`; danach `paletteData = paletteCtx.getImageData(0, 0, PALETTE_SIZE, 1)`. Gerendert wird mit
`cycleColors ?? RAINBOW_COLORS`, immer über `paletteCtx`, nie über den Kontext der Haupt-Canvas.

**c) Streifen** — `strip` (`OffscreenCanvas`, 1 px hoch) enthält die Farben entlang der Canvas-Breite bei Phase 0,
lang genug für jede Phase:

- Breite `stripWidth = Math.ceil(w / repeat) + sliceCount * sliceWidth`.
- Pixel `x` hat die Palettenfarbe bei `u = ((x * repeat) / w) % 1`, Index
  `Math.min(PALETTE_SIZE - 1, Math.floor(u * PALETTE_SIZE))`; r, g, b aus `paletteData`, Alpha immer `255` (die Alpha
  der Farben wird wie bisher ignoriert). Geschrieben über ein `ImageData(stripWidth, 1)` und `putImageData`.
- Neu gerendert nur, wenn sich `w`, `sliceWidth`, `repeat` oder das `paletteData`-Objekt gegenüber dem letzten Rendern
  geändert haben (Vergleich der gemerkten Werte); fehlt `paletteData`, vorher `renderPalette(...)`.

**d) Frame** — `onFrame({now, canvasWidth: w, canvasHeight: h, pixelRatio})`:

```js
const sliceWidth = Math.min(w, Math.max(1, Math.round(colorSliceWidth < 1 ? colorSliceWidth * w : colorSliceWidth * pixelRatio)));
const sliceCount = Math.ceil(w / sliceWidth);
const repeat = cycleColors === undefined ? 1 : effectiveRepeat(cycleColorsRepeat);
updateStrip(w, sliceWidth, sliceCount, repeat);
updateSlices(sliceCount);
const phase = ((now % sliceCycleTime) * cycleDirection) / sliceCycleTime;
const offset = ((((phase * repeat) % 1) + 1) % 1) * (w / repeat);
slicesCtx.imageSmoothingEnabled = false;
slicesCtx.drawImage(strip, offset, 0, sliceCount * sliceWidth, 1, 0, 0, sliceCount, 1);
ctx.imageSmoothingEnabled = false;
ctx.drawImage(slices, 0, 0, sliceCount, 1, 0, 0, sliceCount * sliceWidth, h);
```

- `updateStrip(w, sliceWidth, sliceCount, repeat)` ist der Streifen aus (c): rendert nur bei geänderten Werten neu.
  `updateSlices(sliceCount)` legt `slices` beim ersten Aufruf als `OffscreenCanvas(sliceCount, 1)` an und setzt
  `slices.width = sliceCount`, wenn sich die Zahl geändert hat.
- `imageSmoothingEnabled` in jedem Frame setzen, direkt vor dem Zeichnen: eine Größenänderung einer Canvas setzt den
  Kontextzustand zurück, und `OffscreenWorkerDisplay` ändert die Größe der Haupt-Canvas bei jedem `{resize}`.
- Die Quellrechteck-Grenzen passen immer: `offset < w / repeat <= Math.ceil(w / repeat)`, also
  `offset + sliceCount * sliceWidth < stripWidth`.
- `sliceWidth` ist auf `[1, w]` geklemmt: mindestens 1, damit jede Breite zeichnet; höchstens `w`, damit der Streifen
  bei riesigen Werten nicht explodiert (`stripWidth < 3 * w`).
- `effectiveRepeat(value)` als benannte Modulfunktion mit einem Satz Kommentar: Werte unter 1 zählen als Kehrwert
  (`0.5` wiederholt die Farben zweimal, `0.01` hundertmal) — `return value < 1 ? 1 / value : value`. Diese Semantik
  bleibt laut »Entscheidungen« (READ-001) erhalten.
- Pro Frame keine Strings, keine Arrays, keine `fillRect`-Schleife.
- Ein Kommentar an der Abtastung sagt, warum zwei Schritte: die Scheiben stehen fest und wechseln ihre Farbe, der erste
  `drawImage` nimmt je Scheibe die Farbe an ihrer Mitte, der zweite zieht jeden Pixel ohne Glättung auf Scheibenbreite.

### Schritt 6 — `packages/rainbow-line/scripts/buildPackage.mjs` und die Prüfung der veröffentlichten Quellen

- In `e2e/tests/npm-packages.spec.js` einen Test
  `the published source modules of rainbow-line only import published files` ergänzen: aus
  `packages/rainbow-line/.npm-pkg/package.json` die `exports`-Ziele unter `./src/` nehmen, jede Datei lesen, alle
  relativen Import-Quellen (`from './…'` und `from '../…'`) sammeln und prüfen, dass jede relativ zur Datei im
  `.npm-pkg/` existiert.
- Sichtbar rot machen: mit dem Import von `./attributes.js` in `RainbowLineElement.js` (Schritt 3) und noch ohne die
  nächste Zeile `E2E_SKIP_WEBKIT=1 pnpm nx e2e e2e` laufen lassen — der neue Test ist rot.
- Dann `'src/attributes.js'` in `COPY_FILES` aufnehmen, direkt nach `'src/RainbowLineWorkerDisplay.js'`.

### Schritt 7 — `packages/astro-rainbow-line/RainbowLine.astro`

- Fallback `import.meta.env.BASE_URL ?? '/'` statt `?? '//'`.
- Im Frontmatter nach `rainbowLineSrc`:
  `const RENDERED_SCRIPTS = Symbol.for('@spearwolf/astro-rainbow-line:scripts')`, dann
  `const renderedScripts = (Astro.locals[RENDERED_SCRIPTS] ??= new Set())`,
  `const renderScript = !renderedScripts.has(rainbowLineSrc)`, `renderedScripts.add(rainbowLineSrc)`. Ein Satz
  Kommentar: `Astro.locals` lebt so lange wie das Rendern einer Seite, deshalb bekommt jede Seite den Tag genau einmal.
  Braucht die Zeile für Astros Typen einen TS-Kommentar, dann `// @ts-ignore` wie die übrigen der Datei
  (`noTsIgnore` ist für `.astro` aus, siehe `CLAUDE.md`).
- Im Template `{renderScript && <script is:inline async type="module" src={rainbowLineSrc}></script>}`.
- Der vendored Pfad `js/rainbow-line-v0.4.0.js` bleibt; den bumpt Paket 4.

### Schritt 8 — Dokumentation und Changelogs

**`packages/rainbow-line/README.md`** — nach dem Beispiel-Block (vor `![rainbow-line elements preview]`) ein Abschnitt
`## Attributes` mit einer Tabelle `Attribute | Default | Values` und genau diesen Zeilen:

| Attribute | Default | Values |
| --- | --- | --- |
| `color-slice-width` | `10` | Width of a color slice in css pixels. A value between `0` and `1` is a fraction of the element width (`0.25` makes four slices). Slices are at least one device pixel wide. |
| `slice-cycle-time` | `7` | Seconds for the colors to cycle once through a slice. |
| `cycle-direction` | `right` | `left` or `right`; any other value is `right`. |
| `cycle-colors` | — (rainbow) | A list of css colors, separated by whitespace or commas: `#023 #fa3`, `red, blue`, `rgb(255 0 0) hsl(200 80% 50%)`. Invalid colors are skipped with a warning in the console; without a single valid color the line shows the rainbow. |
| `cycle-colors-repeat` | `1` | How often the `cycle-colors` repeat across the width. A value below `1` counts as its reciprocal: `0.5` repeats them twice, `0.01` a hundred times. Has no effect on the rainbow. |

Darunter zwei Sätze: Numeric attributes that are missing, not a number, or not above `0` use their default. Every
attribute can be changed while the element is on the page.

**`packages/astro-rainbow-line/README.md`** — unter dem Hinweis-Block der Satz: The `<script>` tag is rendered once per
page, however many `<RainbowLine>` the page contains.

**`packages/rainbow-line/CHANGELOG.md`**, unter `## [Unreleased]` — in die bestehende `### Fixed`-Liste diese Einträge:

- a `color-slice-width`, `slice-cycle-time` or `cycle-colors-repeat` that is `0`, negative or not a number uses the default; slices are at least one device pixel wide, so every value keeps the line animating
- removing a numeric attribute sets it back to its default
- `cycle-colors` accepts colors separated by commas, tabs and line breaks; invalid colors are skipped with a console warning, and without any valid color the line shows the rainbow
- `cycle-colors-repeat` takes effect when it changes while the element is connected

und in die bestehende `### Changed`-Liste:

- every frame is drawn with two `drawImage` calls from a pre-rendered strip of colors, however narrow the slices are
- the README documents all attributes with their defaults and values

**`packages/astro-rainbow-line/CHANGELOG.md`**, unter `## [Unreleased]` — in `### Changed`:

- the `<script>` tag that loads rainbow-line is rendered once per page, however many `<RainbowLine>` the page contains

und ein neuer Abschnitt `### Fixed` darunter:

- without a `BASE_URL` the path of the script starts at `/`

### Bekannt und anderswo zugeteilt

Nicht in diesem Paket, nicht als Nebenbefund melden:

- `packages/rainbow-line/CHANGELOG.md:14` (Leerzeile in der Fixed-Liste) und `:19` (»instead of `es2017`«) — Paket 5.
- `packages/astro-rainbow-line/rainbow-line-v0.4.0.js` trägt den alten Code; die Astro-e2e-Seite zeigt deshalb bis
  Paket 4 die alte Zeichenroutine — Paket 4 erneuert die Datei mit dem Bump.

## Findings im Volltext

**CORR-001 · high · packages/rainbow-line/src/RainbowLineWorkerDisplay.js:26** — Numerische Attribute im Worker
validieren: `color-slice-width` ≤ 0 hängt den Worker in einer Endlosschleife
Weitere Fundstellen laut Audit: `RainbowLineWorkerDisplay.js:31`, `:34`, `RainbowLineElement.js:48`, `:66`.
Die Zeichenschleife läuft `while (x < w) { …; x += _colorSliceWidth }`. Für `color-slice-width="0"`, negative Werte oder
Brüche, die nach `Math.round(colorSliceWidth * w)` auf 0 Pixel landen (`0.001` bei 360 px Breite), wird
`_colorSliceWidth` 0 oder negativ — die Schleife terminiert nie. Der Worker-Thread steht dann bei 100 % CPU,
verarbeitet keine Nachricht mehr und lässt sich mangels `terminate`-Pfad (siehe RES-001) nur noch durch Neuladen der
Seite loswerden. `asNumberValue()` und `attributeChangedCallback()` reichen jede endliche Zahl durch, eine Prüfung
findet auf keiner Seite statt. Dieselbe Lücke wirkt leiser bei den anderen Zahlen: `slice-cycle-time="0"` erzeugt
`now % 0 = NaN` und damit einen ungültigen `hsl(NaN…)`-String, den der Canvas stillschweigend ignoriert — die Linie
friert auf der letzten Farbe ein; `cycle-colors-repeat="0"` liefert `Infinity`, einen `NaN`-Index in die Gradient-LUT
und `rgb(undefined,…)`.
Beleg: `const _colorSliceWidth = colorSliceWidth < 1 ? Math.round(colorSliceWidth * w) : colorSliceWidth;` gefolgt von
`x += _colorSliceWidth;` ohne untere Schranke.
Empfehlung: Im Worker in `parseMessageData()` jede Zahl normalisieren:
`colorSliceWidth = Number.isFinite(v) && v > 0 ? v : 10`, in `onFrame` zusätzlich
`_colorSliceWidth = Math.max(1, Math.round(...))`; `sliceCycleTime` auf `> 0` klemmen, `cycleColorsRepeat` auf `> 0`.
Dieselben Schranken auf dem Main-Thread in `attributeChangedCallback()`, damit ungültige Werte gar nicht erst gesendet
werden. Einen Test ergänzen, der `color-slice-width="0"` setzt und prüft, dass die Linie weiter animiert.

**CORR-003 · medium · packages/rainbow-line/src/RainbowLineWorkerDisplay.js:63** — `cycle-colors` robust parsen und
ungültige Farben abfangen
Weitere Fundstellen laut Audit: `RainbowLineWorkerDisplay.js:82`, `:98`.
Die Farbliste wird mit dem Regex `/(#[a-f0-9]+|[a-z]+\([^)]+\)|[a-z]+([^(]|$))( |$)+/g` zerlegt. Die Alternative
`[a-z]+([^(]|$)` verschluckt das Zeichen hinter einem Farbnamen, so wird aus `red, blue` das Token `red,`; Tabs oder
Zeilenumbrüche als Trenner passen gar nicht. Jedes ungültige Token landet in `gradient.addColorStop()`, das mit
`SyntaxError` wirft — mitten im Message-Handler, nachdem `cycleColors` schon gesetzt ist. Beim ersten Setzen bleibt
`gradientImageData` dann `null`, der nächste `onFrame` wirft `TypeError` und der Loop stirbt (CORR-002).
Nutzereingaben wie `cycle-colors="red, blue"` oder ein Tippfehler im Farbnamen machen das Element damit unbrauchbar.
Nebenbei erzeugt `createLinearGradientImage()` den Gradient über `ctx` (Haupt-Canvas) statt über `gradientCtx`, obwohl
er nur auf der Gradient-Canvas gezeichnet wird.
Beleg: `'red, blue'.toLowerCase().matchAll(...)` → `['red,', 'blue']`; `addColorStop(0, 'red,')` wirft
`SyntaxError: The value provided ('red,') could not be parsed as a color.`
Empfehlung: Auf `split(/[\s,]+/)` umstellen, leere Tokens filtern, und `addColorStop()` je Token in `try`/`catch`
nehmen — ungültige Farben überspringen und per `console.warn` melden. Den alten Gradient erst ersetzen, wenn mindestens
eine gültige Farbe übrig ist; bei null gültigen Farben auf den Regenbogen-Modus zurückfallen. `createLinearGradient()`
über `gradientCtx` erzeugen. Tests für `red, blue`, Mehrfach-Whitespace und einen ungültigen Namen ergänzen.

**CORR-004 · medium · packages/rainbow-line/src/RainbowLineElement.js:8** — `cycle-colors-repeat` in
`observedAttributes` aufnehmen
Weitere Fundstellen laut Audit: `RainbowLineElement.js:52`, `RainbowLineWorkerDisplay.js:69`.
`getInitialWorkerAttributes()` sendet `cycle-colors-repeat` beim Verbinden, und der Worker verarbeitet das Feld auch in
`parseMessageData()`. In `observedAttributes` fehlt der Name jedoch, deshalb löst eine spätere Änderung
(`setAttribute`, Framework-Binding) keinen `attributeChangedCallback()` aus — das Attribut wirkt nur beim ersten
Connect. Der Astro-Wrapper reicht es als Prop durch, der Fehler ist also auch dort sichtbar, sobald sich der Wert
dynamisch ändert. Der Test »reacts to attribute changes after it has been connected« deckt genau dieses Attribut nicht
ab.
Beleg: `static observedAttributes = ['color-slice-width', 'slice-cycle-time', 'cycle-direction', 'cycle-colors'];`
Empfehlung: `'cycle-colors-repeat'` ergänzen; `attributeChangedCallback()` behandelt es dann bereits über den
generischen `parseFloat`-Pfad. Den bestehenden Attribut-Änderungs-Test um diesen Fall erweitern.

**PERF-001 · medium · packages/rainbow-line/src/RainbowLineWorkerDisplay.js:25** — Zeichenroutine von N
`fillRect`+String-Parses pro Frame auf ein `drawImage` umstellen
Weitere Fundstelle laut Audit: `RainbowLineWorkerDisplay.js:74`.
Pro Frame läuft eine Schleife über alle Farbscheiben; für jede wird ein neuer CSS-Farbstring gebaut (`hsl(...)` oder
`rgb(...)` aus der LUT), von der Canvas-Engine geparst und ein `fillRect` abgesetzt. Bei `color-slice-width="1"` und
1920 px Breite sind das 1920 String-Allokationen, 1920 Farb-Parses und 1920 Draw-Calls pro Frame und Element; die
Astro-Variante mit `shadow` verdoppelt das, weil der Schatten ein zweites Element mit eigenem Worker ist. Auf einem
Laptop bleibt das unter 16 ms, auf schwachen Mobilgeräten mit mehreren Linien nicht mehr. Die Farben hängen nur von
`x/w` und `t` ab, sind also ein zeitlich verschobenes, periodisches Muster — genau das, was ein einmal gerendertes Bild
plus Offset abdeckt.
Empfehlung: Bei Parameter- oder Größenänderung einen Streifen der Breite `w` (Regenbogen oder Gradient, in Scheiben
quantisiert) einmal in eine zweite `OffscreenCanvas` rendern. Pro Frame nur noch den Zeit-Offset `dx = (t mod 1) * w`
berechnen und den Streifen mit zwei `drawImage`-Aufrufen (Wrap-around) auf die Haupt-Canvas kopieren. Für den
Gradient-Modus die LUT als vorberechnete `rgb()`-Strings oder direkt als `ImageData`-Zeile halten, statt pro Scheibe zu
formatieren.
Abweichung: siehe »Entscheidungen dieses Zugs 0«, Punkt 1 — die Scheiben bleiben stehen, die zwei `drawImage` laufen
über eine Zwischen-Canvas.

**READ-001 · low · packages/rainbow-line/src/RainbowLineWorkerDisplay.js:34** — Verkleidete Formeln und
Kommentar-Reste in der Zeichenroutine bereinigen
Weitere Fundstellen laut Audit: `RainbowLineElement.js:71`, `RainbowLineWorkerDisplay.js:63`.
`cycleColorsRepeat < 1 ? w / (cycleColorsRepeat * w) : cycleColorsRepeat` ist `1 / cycleColorsRepeat` — die Breite
kürzt sich heraus, die Absicht (»Werte unter 1 sind Kehrwerte«) steht nirgends. Der Farb-Regex hat keinen Kommentar,
der seine Grammatik erklärt (und ist fehlerhaft, CORR-003). In `RainbowLineElement.js` steht ein auskommentiertes
`console.log`. Für sich harmlos, zusammen erschweren sie das Nachvollziehen des einzigen nicht trivialen Codes im
Paket.
Empfehlung: Die Kehrwert-Semantik als benannte Funktion (`effectiveRepeat(value)`) mit einem Satz Kommentar schreiben
und im README dokumentieren, den Regex durch die Split-Variante aus CORR-003 ersetzen, das tote `console.log` löschen.
Abweichung: statt der Split-Variante der Klammer-bewusste Tokenizer, Punkt 4 der Entscheidungen oben.

**CONS-001 · low · packages/astro-rainbow-line/RainbowLine.astro:50** — Skript-Tag der Astro-Komponente einmal pro
Seite rendern und den `BASE_URL`-Fallback aufräumen
Weitere Fundstelle laut Audit: `RainbowLine.astro:23`.
`<script is:inline … src>` wird bei jeder Komponenteninstanz ausgegeben; die E2E-Seite mit drei `<RainbowLine>` (eine
davon mit `shadow`) enthält den Tag dreimal. Der Browser dedupliziert Module nach URL, es entsteht also kein
Doppel-`define`, aber jede Instanz vergrößert das HTML und zeigt in DevTools drei identische Skripte. Der Fallback
`import.meta.env.BASE_URL ?? '//'` erzeugt bei Greifen `///js/…`, ein protokoll-relativer Pfad auf einen leeren Host —
Astro setzt `BASE_URL` allerdings immer, der Zweig ist tot.
Empfehlung: Den Skript-Tag über ein `Set` in `Astro.locals` oder ein Slot-Layout nur beim ersten Rendern ausgeben
(Astro bietet dafür kein eingebautes Dedupe bei `is:inline`), alternativ das Laden des Skripts der Seite überlassen und
im README dokumentieren. Fallback auf `'/'` ändern oder streichen.

**TEST-001 · medium · packages/rainbow-line/test/rainbowLineBehaviour.js:43** — Lifecycle- und Negativ-Tests ergänzen,
damit die Suite Leaks und Hänger meldet statt sie zu umgehen (hier nur der Teil: Negativ-Tests für die Wertebereiche
aus CORR-001 und CORR-003, Test für einen Laufzeitwechsel von `cycle-colors-repeat`; Lifecycle, Listener-Fehler,
`expect.poll` und Firefox/WebKit hat Paket 2 erledigt)
Die Suite ist gut gebaut — Blackbox gegen Build-Output, Pixel-Assertions per Screenshot, E2E gegen die publizierten
Verzeichnisse — hat aber Lücken genau dort, wo dieser Audit die Defekte findet: `afterEach` terminiert die Worker selbst
und verdeckt so RES-001; kein Test prüft, was nach `remove()` mit dem Worker passiert. Es gibt keinen Negativ-Test
(ungültige Farbe, `color-slice-width="0"`, `slice-cycle-time="0"`), keinen Test für eine Laufzeitänderung von
`cycle-colors-repeat` (CORR-004) und keinen Test, dass die Animation nach einem Listener-Fehler weiterläuft (CORR-002).
Die Build-Targets nennen `safari17` und `firefox122`, getestet wird nur Chromium. Timing-Assertions (`sleep(300)`,
`waitForTimeout(300)`) plus `retries: 1` in CI können Flakiness kaschieren.
Empfehlung: Einen Test »terminates its worker when removed« schreiben, der nach `remove()` über eine Nachricht aus dem
Worker-Fixture oder Playwrights `page.workers()` prüft, dass kein Worker mehr läuft; das manuelle `terminate()` in
`afterEach` danach entfernen. Negativ-Tests für die Wertebereiche aus CORR-001 und CORR-003 hinzufügen. Für die
Animations-Tests `expect.poll` statt festem `sleep` nutzen. Ein zweites Playwright-Projekt `webkit` (mindestens für
`bundle.html`) aufnehmen, sobald `pnpm playwright:install` es mitinstalliert.

## Verlauf

- 2026-09-22 Zug 0: Detailplan steht · CORR-001 verschoben: Worker `:27-28` und `:43` (Paket 2 hat nur den Zweig ab 1
  auf mindestens 1 px gesetzt, `0`, negative Werte und Brüche unter einem Pixel hängen weiter), `slice-cycle-time`
  `:33`/`:37`, `cycle-colors-repeat` `:36`, Element `:48` und `:66` unverändert · CORR-003 verschoben: Regex `:65`,
  `ctx.createLinearGradient` `:90`, `addColorStop` `:96` · CORR-004 unverändert `RainbowLineElement.js:8` · PERF-001
  unverändert `:25-45` und `getGradientColor` `:76-82`, durch die physischen Pixel aus Paket 2 auf HiDPI mit doppelt so
  vielen Scheiben · READ-001 verschoben: Formel `:36`, `console.log` im Element `:71`, Regex `:65` · CONS-001
  unverändert `RainbowLine.astro:23` und `:50` · TEST-001-Teil offen: `rainbowLineBehaviour.js` ohne Negativ-Tests und
  ohne Test für `cycle-colors-repeat` · Folgen aus Paket 2: sechs Stellen (drei Changelog, `README.md`,
  `e2e/playwright.config.js:8`, Test für `{isConnected: false}`) als Symptome → neues Paket 5 (`Folge von: Paket 2`),
  vendored Bundle bleibt bei Paket 4 · Queue »Offene Befunde«: zwei Einträge in `OffscreenDisplay.js`, andere Ursache,
  liegen gelassen
- 2026-09-22 Zug 1: Implementierer beauftragt · opus (stärkste Stufe), effort medium · Report nach `$ARBEITSDIR/paket-3.impl-1.json`
- 2026-09-22 Zug 2: Report FERTIG · 12 Dateien geändert, neu `packages/rainbow-line/src/attributes.js` · Arbeitsbaum schmutzig · rote Läufe belegt (rainbow-line 26 rot, astro 1, e2e 2 bzw. 3) · 3 Nebenbefunde gemeldet · eigener Verify exit=0 (`$ARBEITSDIR/paket-3.verify.log`)
- 2026-09-22 Zug 3: Reviewer beauftragt · opus, effort medium · Diff `$ARBEITSDIR/paket-3.diff` (901 Zeilen)
- 2026-09-22 Zug 3: Reviewer freigeben · alle 7 Findings behoben · 0 kritisch, 0 wichtig, 4 klein · 1 Nebenbefund (Worker-URL des Quell-Subpfads, vorbestehend seit `e57a13c`) · Report `$ARBEITSDIR/paket-3.review-1.json`
- 2026-09-22 Zug 4: keine Runde nötig
- 2026-09-22 Zug 5: Commit c667c20 (13 Dateien, +428/−87) · Verify `$ARBEITSDIR/paket-3.verify.log` exit=0, keine Codeänderung seither · 4 Nebenbefunde in »Offene Befunde« (Worker-URL medium, drei low), 1 Folge → Paket 4

## Urteil des Reviewers

| Finding | Urteil | Fundstelle |
| --- | --- | --- |
| CORR-001 | behoben | `src/attributes.js:13-16` (`toPositiveNumber`); Worker `RainbowLineWorkerDisplay.js:89`, `:92`, `:101`; Element `RainbowLineElement.js:26-30`; Scheibenbreite auf `[1, w]` geklemmt `RainbowLineWorkerDisplay.js:63-66`; keine Zeichenschleife mehr |
| CORR-003 | behoben | Tokenizer `RainbowLineWorkerDisplay.js:110`, Farbprüfung `:139`, Warnung und Rückfall auf den Regenbogen `:149-166`, Gradient nur über `paletteCtx` |
| CORR-004 | behoben | `RainbowLineElement.js:13` und `:35`; Test `rainbowLineBehaviour.js:227` |
| PERF-001 | behoben (mit der Abweichung aus Entscheidung 1) | `RainbowLineWorkerDisplay.js:79` und `:81`, genau zwei `drawImage` je Frame; Streifen und Palette nur bei geänderten Werten neu (`updateStrip`) |
| READ-001 | behoben | `effectiveRepeat` mit Kommentar `RainbowLineWorkerDisplay.js:52`; Regex ersetzt; `console.log` entfernt; README `packages/rainbow-line/README.md:17` ff. |
| CONS-001 | behoben | `RainbowLine.astro:30-34` und `:57`, Fallback `:23`; Tests `RainbowLine.test.js:72`, `e2e/tests/astro-rainbow-line.spec.js:20` |
| TEST-001 (Teil Paket 3) | erfüllt | `rainbowLineBehaviour.js:169-225`, `:227`, `:237`, `:253` |

Der Reviewer hat die Abtastung nachgerechnet: Farbe an der Scheibenmitte `((phase + xc/w) * repeat) mod 1`, Quellrechteck
immer im Streifen, `stripWidth < 2w + sliceWidth`.

## Kleine Befunde

- `packages/astro-rainbow-line/RainbowLine.astro:31-32` — kein `// @ts-ignore` über dem Symbol-Index auf `Astro.locals`;
  möglicherweise TS7053 unter Astros strict-Typen in Konsumentenprojekten (unbelegt). Als Folge an Paket 4 gegeben.
- `packages/rainbow-line/test/rainbowLineBehaviour.js:199-200` — `test.each` mit vier Fällen ohne Platzhalter im Namen,
  vier gleichnamige Tests (Name wörtlich aus dem Plan); `: %j` anhängen.
- `packages/rainbow-line/src/RainbowLineWorkerDisplay.js:52` und `:199` — denormalisierte Werte wie
  `cycle-colors-repeat="1e-320"` ergeben einen Kehrwert `Infinity`, das Bild bleibt schwarz stehen; kein Hänger, kein
  Absturz, kein Handlungsbedarf laut Reviewer.
- `e2e/tests/npm-packages.spec.js:71-83` — die Import-Prüfung erfasst nur `from '…'`, nicht Side-Effect-Imports und
  `new URL('…', import.meta.url)`; dadurch fällt der Worker-URL-Nebenbefund durch (in »Offene Befunde« mit vermerkt).

## Nebenbefunde — Begründung der Urteile

- Worker-URL des Quell-Subpfads: `git show e57a13c:packages/rainbow-line/src/RainbowLineElement.js` hat dieselbe Zeile
  `new URL('rainbow-line.worker.js', import.meta.url)`, `COPY_FILES` kopierte damals wie heute nur das gebaute
  `rainbow-line.worker.js` ins Paket-Root — vorbestehend, nicht aus diesem Lauf. Severity medium: ein veröffentlichter
  Subpfad (Entscheidung DEP-001) funktioniert ohne eigenes `createWorker()` nicht. Scope-Regel »alles« → Scope.
- README-`mailto`, Vergleichslinks im CHANGELOG, doppelter Slash im astro-README: gemeldet vom Implementierer, unberührt
  von diesem Paket, low; Scope-Regel »alles« → Scope.
