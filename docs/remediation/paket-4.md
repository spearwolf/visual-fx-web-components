# Paket 4 — Typen, Dokumentation und Release-Stand

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: TYPES-001 (medium), DX-001 (medium), BUILD-001 (medium)
- Aufgenommen in Zug 0 (Begründung unter »Triage«):
  - Folge aus Paket 3: `packages/astro-rainbow-line/RainbowLine.astro:31-32` — `Astro.locals[RENDERED_SCRIPTS]` wirft unter `strict` TS7053 (belegt)
  - Nebenbefund `packages/offscreen-display/src/lib/main/OffscreenDisplay.js:81` und `:167` — JSDoc der Hooks sagt nicht, was sie liefern
  - Nebenbefund `packages/rainbow-line/README.md:38` — `mailto`-Betreff nennt `@spearwolf/offscreen-display`
  - Nebenbefund `packages/rainbow-line/CHANGELOG.md:70-72` — Vergleichslinks: `unreleased` ab `rainbow-line-v0.2.1`, kein Link für 0.4.0
  - Nebenbefund `packages/astro-rainbow-line/README.md:5` — Pfad `${import.meta.env.BASE_URL}/js/…` mit doppeltem Slash
- Ziel: Die Packages liefern Typdeklarationen, die READMEs beschreiben die tatsächliche API, und Versionen, Changelogs sowie das vendored Bundle stehen auf dem Release-Stand.
- Modell: stärkste Stufe
- Effort: high
- Dateien:
  - neu: `packages/offscreen-display/tsconfig.build.json`, `packages/rainbow-line/tsconfig.build.json`, `e2e/types/consumer.ts`, `packages/astro-rainbow-line/rainbow-line-v0.5.0.js`
  - gelöscht: `packages/astro-rainbow-line/rainbow-line-v0.4.0.js`
  - Typen und Build: `tsconfig.json`, `nx.json`, `packages/rainbow-line/project.json`, `packages/offscreen-display/package.json`, `packages/rainbow-line/package.json`, `packages/offscreen-display/scripts/buildPackage.mjs`, `packages/rainbow-line/scripts/buildPackage.mjs`
  - Quellen: `packages/offscreen-display/src/lib/main/OffscreenDisplay.js`, `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`, `packages/rainbow-line/src/RainbowLineElement.js`, `packages/rainbow-line/src/RainbowLineWorkerDisplay.js`, `packages/astro-rainbow-line/RainbowLine.astro`
  - `noImplicitAny`-Stellen außerhalb der Pakete: `e2e/astro.config.mjs`, `e2e/server.mjs`, `e2e/tests/helpers.js`, `e2e/tests/npm-packages.spec.js`, `scripts/makeBanner.mjs`, `scripts/makeBanner/banner.mjs`, `scripts/makeBanner/makeVersionWithBuild.mjs`, `scripts/makePackageJson.mjs`, `scripts/makeTODO.mjs`, `scripts/publishNpmPkg.mjs`, `testing/pixels.js`
  - Doku und Release: `packages/*/README.md`, `packages/*/CHANGELOG.md`, `packages/astro-rainbow-line/package.json`, `CLAUDE.md`
- Vorgehen: siehe unten. Reihenfolge: F1–F3 (Konsumentenprüfung schreiben, rot sehen), dann A, B, C, D, dann E (E5 vor dem Bump, rot nach dem Bump, grün nach dem Vendoring), zuletzt G. E kommt nach allen Code-Änderungen, weil das vendored Bundle den fertigen Code tragen muss.
- Verify: `E2E_SKIP_WEBKIT=1 pnpm verify` (lint, typecheck, build, test, e2e), vorher die Prüfschritte aus G
- Commit: `ship type declarations, document the packages, release offscreen-display 0.3.0, rainbow-line 0.5.0 and astro-rainbow-line 1.4.0` — Body in Stichpunkten: declarations built from the JSDoc and referenced in `exports`; typecheck without implicit any; readmes describe lifecycle, events, messages, attributes and props; changelogs dated, vendored rainbow-line bundle 0.5.0. Keine Finding-IDs.
- Nach dem Commit (Zug 5): die vier in dieses Paket aufgenommenen Einträge in »Offene Befunde« des Plans auf `[x]` mit dem Hash setzen; die Einträge zu `OffscreenDisplay.js:214` und zur Worker-URL bleiben offen.
- Verlauf:
  - 2026-09-22 Zug 0: Detailplan steht · TYPES-001 unverändert (`exports` ohne `types` in `offscreen-display/package.json:19-26` und `rainbow-line/package.json:19-38`; `tsconfig.json:15`/`:16` weiter `strict: false`/`noImplicitAny: false`; `RainbowLineElement.js:77` untypisiert), 54 Stellen unter `--noImplicitAny` · DX-001 umgeformt: `display.on(` weiter in `offscreen-display/README.md:65`, `-D` bei `:15`; rainbow-line-Attribut-Tabelle von Paket 3 erledigt; astro-`CHANGELOG.md` von Paket 1 erledigt, astro-README ohne Props · BUILD-001 unverändert: Versionen 0.2.0/0.4.0/1.3.0, `[Unreleased]` in allen drei Changelogs, `^0.3.0`-Behauptung in `rainbow-line/CHANGELOG.md:34` (npm: 0.4.0 hing an `^0.2.0`), vendored `rainbow-line-v0.4.0.js` mit altem Code · Folge aus Paket 3 (`RainbowLine.astro:31-32`) hierher, TS7053 unter `strict` nachgestellt · Folge aus Paket 2 (vendored Bundle) ist Teil von BUILD-001 · aus der Queue vier Nebenbefunde aufgenommen, zwei bleiben liegen (`OffscreenDisplay.js:214`, Worker-URL in `RainbowLineElement.js`)
  - 2026-09-22 Zug 1: Implementierer beauftragt, stärkste Stufe (`opus`), Effort high · Brief `paket-4.impl-1.brief.txt`, Report nach `paket-4.impl-1.json`
  - 2026-09-22 Zug 2: Report FERTIG · 40 Pfade (35 geändert, 4 neu: `tsconfig.build.json` ×2, `e2e/types/consumer.ts`, `rainbow-line-v0.5.0.js`; gelöscht `rainbow-line-v0.4.0.js`) · rote Läufe belegt (F: 10 Fehler TS7016/TS4112/TS2339/TS2578; E5 nach Bump; C-Probe TS7053) · Arbeitsbaum schmutzig · Verify `NX_SKIP_NX_CACHE=true E2E_SKIP_WEBKIT=1 pnpm verify` exit=0 (`paket-4.verify.log`)
  - 2026-09-22 Zug 3: Reviewer beauftragt (`opus`, high), Diff `paket-4.diff` (ohne die minifizierten vendored Bundles; `rainbow-line-v0.5.0.js` byte-gleich mit `packages/rainbow-line/bundle.js`)
  - 2026-09-22 Zug 3: Reviewer `paket-4.review-1.json` — freigeben, alle drei Findings und fünf Aufnahmen behoben, 0 kritisch, 0 wichtig, 5 klein
  - 2026-09-22 Zug 4: keine Runde nötig
  - 2026-09-22 Zug 5: Commit 07f8a56 (36 Dateien, Trailer `Remediation-Run: 2026-09-22`) · Verify `paket-4.verify.log` exit=0, danach keine Codeänderung · der erste `git add` brach an der schon gelöschten `rainbow-line-v0.4.0.js` ab und der Commit trug nur die Löschung; per `--amend` (ungepusht, eigener Commit) um die übrigen 35 Pfade ergänzt · fünf vorbestehende Nebenbefunde des Implementierers in »Offene Befunde« (alle bei `e57a13c` schon vorhanden)

## Vorgehen

Zustand vor Beginn: HEAD `8c34e81`, Arbeitsbaum sauber. Alle Zeilennummern
unten beziehen sich auf diesen Stand. Die Belege aus Zug 0 stammen aus Proben
mit TypeScript 7.0.2 (`pnpm exec tsc --version`) in einem Scratch-Verzeichnis.

### A. Typdeklarationen erzeugen und ausliefern

TypeScript 7 erzeugt aus den JSDoc-Kommentaren der JS-Quellen `.d.ts`-Dateien
(belegt). Der Weg ist je Package ein `tsconfig.build.json`, das vom Root-
`tsconfig.json` erbt.

1. `packages/offscreen-display/tsconfig.build.json` neu:
   ```json
   {
     "extends": "../../tsconfig.json",
     "include": ["src/**/*.js"],
     "compilerOptions": {
       "noEmit": false,
       "declaration": true,
       "emitDeclarationOnly": true,
       "rootDir": "src",
       "outDir": "dist/types",
       "types": []
     }
   }
   ```
   Ergebnis: `dist/types/index.d.ts`, `dist/types/worker.d.ts`,
   `dist/types/lib/main/OffscreenDisplay.d.ts`,
   `dist/types/lib/worker/OffscreenWorkerDisplay.d.ts`.
2. `packages/rainbow-line/tsconfig.build.json` neu, wie oben, aber
   `"include": ["src/attributes.js", "src/RainbowLineElement.js", "src/RainbowLineWorkerDisplay.js"]`
   und zusätzlich `"paths": {}` in `compilerOptions`. Grund für `paths: {}`:
   das Root-`tsconfig.json` biegt `@spearwolf/offscreen-display` auf dessen
   `src/` um; im Typen-Build soll der Import über `node_modules` zum gebauten
   Package und seinen `dist/types` laufen — so, wie ein Konsument ihn sieht —,
   und die offscreen-display-Quellen gehören nicht ins Programm (sie lägen
   außerhalb von `rootDir`). Das setzt den Build von offscreen-display voraus;
   den erzwingt schon `dependsOn: ["^build"]`.
3. `build`-Skripte beider Packages: `"build": "pnpm node scripts/build.mjs && pnpm exec tsc -p tsconfig.build.json"`.
4. nx:
   - `nx.json` → `namedInputs.sharedGlobals` um `"{workspaceRoot}/tsconfig.json"` ergänzen: beide Typen-Builds erben davon, eine Änderung dort muss den Build-Cache verwerfen.
   - `packages/rainbow-line/project.json` → `targets.build.outputs` um `"{projectRoot}/dist"` ergänzen, `namedInputs.default` um `"!{projectRoot}/dist/**/*"` (die Projektdatei überschreibt die Default-Inputs aus `nx.json` und nimmt `dist` sonst als Eingabe). offscreen-display hat `{projectRoot}/dist` schon als Output; `dist` ist in `.gitignore`.
5. `exports` mit `types` **als erste Bedingung** (TypeScript nimmt die erste passende):
   - `packages/offscreen-display/package.json`:
     ```json
     "types": "dist/types/index.d.ts",
     "exports": {
       ".": {"types": "./dist/types/index.d.ts", "default": "./dist/offscreen-display.js"},
       "./worker.js": {"types": "./dist/types/worker.d.ts", "default": "./dist/offscreen-display-worker.js"}
     },
     ```
     (das Top-Level-`types` neben `main`/`module`, für Konsumenten mit älterer Modulauflösung)
   - `packages/rainbow-line/package.json`: nur die beiden Quell-Subpfade bekommen Typen:
     ```json
     "./RainbowLineElement.js": {"types": "./dist/types/RainbowLineElement.d.ts", "default": "./src/RainbowLineElement.js"},
     "./RainbowLineWorkerDisplay.js": {"types": "./dist/types/RainbowLineWorkerDisplay.d.ts", "default": "./src/RainbowLineWorkerDisplay.js"},
     ```
     `.`, `./bundle.js`, `./rainbow-line.js`, `./rainbow-line.worker.js` sind Side-Effect-Module ohne Exporte und bleiben ohne `types`: TypeScript 7 akzeptiert `import 'rainbow-line'` ohne Deklaration, nur benannte Imports aus untypisierten Modulen scheitern mit TS7016 (belegt). Kein Top-Level-`types` bei rainbow-line.
6. `scripts/buildPackage.mjs` beider Packages: `dist/types` rekursiv nach `.npm-pkg/dist/types` kopieren, `fs.cpSync(resolve(projectRoot, 'dist/types'), resolve(packageRoot, 'dist/types'), {recursive: true})`, ohne Existenzprüfung — fehlen die Typen, soll der Paketbau laut scheitern. Die übrigen `COPY_FILES` bleiben wie sie sind.
7. JSDoc an der öffentlichen Oberfläche, damit die Deklarationen kein `any` tragen. Was die Probe ohne diese Änderungen emittiert: `OffscreenWorkerDisplay` mit `canvas: any`, `isConnected: any`, `canvasWidth: any`, `canvasHeight: any`, `get ready(): any`, `parseMessageData(data: any)`; `OffscreenDisplay#asNumberValue(attributeName: any, defaultValue: any): any`.

   `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`:
   - Die per `Object.defineProperties` angelegten Signal-Properties als Klassenfelder mit JSDoc-Typ deklarieren, vor `#rafID`, mit einem Kommentar, warum sie da stehen (etwa `// declared for the type declarations; the constructor turns them into accessors of signals`):
     `/** @type {OffscreenCanvas | null} */ canvas;` · `/** @type {boolean} */ isConnected;` · `/** @type {number} the canvas width in physical pixels */ canvasWidth;` · `/** @type {number} the canvas height in physical pixels */ canvasHeight;` · `/** @type {number} the ratio of physical pixels to css pixels */ pixelRatio;`
     Belegt: TypeScript 7 übernimmt diese Felder typisiert in die `.d.ts`; zur Laufzeit ersetzt `Object.defineProperties` die zuvor angelegten Felder durch die Accessoren, sie bleiben eigene, aufzählbare Properties mit den Signal-Werten (`canvas: null`, `isConnected: false`, `pixelRatio: 1`). Die reine Deklaration `/** @type {…} */ this.canvas;` im Konstruktor ignoriert TypeScript 7 dagegen — nicht verwenden.
   - `this.now = 0;` im Konstruktor mit `/** @type {number} the time of the current frame in seconds */`.
   - `get ready()` mit `/** @returns {boolean} */` und `return this.canvas != null && this.isConnected;` (liefert bisher das Canvas-Objekt oder einen falsy-Wert; die Aufrufer prüfen nur Wahrheit).
   - Die statischen Event-Namen als Literaltypen: `static Canvas = /** @type {const} */ ('onCanvas');`, ebenso `Init`, `Resize`, `Frame` (die Deklaration wird dann `static Canvas: 'onCanvas';`, belegt).
   - `#contextAttributes` mit `/** @type {Record<string, unknown> | undefined} */`, `#onFrame(now)` mit `@param {number} now` (Zeitstempel von `requestAnimationFrame` in Millisekunden).
   - Zwei exportierte Typedefs am Modulkopf (ein JSDoc-`@typedef` in einem Modul wird ein exportierter Typ der `.d.ts`):
     ```js
     /**
      * A message from the main thread, as `OffscreenDisplay` sends it: first `canvas` together with `contextAttributes`
      * and the attributes of `getInitialWorkerAttributes()`, later `isConnected` and `resize`. Subclasses may add more.
      * @typedef {{
      *   canvas?: OffscreenCanvas,
      *   contextAttributes?: Record<string, unknown>,
      *   isConnected?: boolean,
      *   resize?: {width: number, height: number, pixelRatio?: number},
      * } & Record<string, unknown>} OffscreenDisplayMessage
      */

     /**
      * The events of an `OffscreenWorkerDisplay` and the arguments their listeners receive, as an event map for
      * `@spearwolf/eventize` — for example `EventListenerMethods<OffscreenWorkerDisplayEvents>`.
      * @typedef {{
      *   onCanvas: [display: OffscreenWorkerDisplay, contextAttributes: Record<string, unknown> | undefined],
      *   onInit: [display: OffscreenWorkerDisplay],
      *   onResize: [display: OffscreenWorkerDisplay],
      *   onFrame: [display: OffscreenWorkerDisplay],
      * }} OffscreenWorkerDisplayEvents
      */
     ```
     Parst TypeScript die mehrzeilige Form nicht, dieselben Typen einzeilig oder als `@typedef {object}` mit `@property`-Zeilen; maßgeblich ist, was in `dist/types/lib/worker/OffscreenWorkerDisplay.d.ts` ankommt.
   - `parseMessageData(data)` mit `@param {OffscreenDisplayMessage | null | undefined} data`.
   - Eine typisierte Event-Map über eventizes `EventizedObject<…>` ist **nicht** Teil des Pakets: sie hängt an einem nicht exportierten Brand-Symbol und verlangt in TypeScript eine Interface-Verschmelzung, die es in JS nicht gibt; ohne Laufzeitumbau (etwa `extends Eventize`) ist sie nicht zu haben. Die Typedef oben ist der Weg, auf dem Konsumenten die Listener typisieren.

   `packages/offscreen-display/src/lib/main/OffscreenDisplay.js`:
   - Im Konstruktor: `/** @type {Worker | undefined} the rendering worker, from connecting the element until dispose() */ this.worker = undefined;` und neu daneben `/** @type {HTMLCanvasElement | undefined} the canvas whose control went to the worker; a reconnect after dispose() brings a fresh one */ this.canvas = undefined;`.
   - `:78-82` JSDoc von `getContextAttributes()` neu (aufgenommener Nebenbefund): sagen, was zurückkommt — die Attribute für `getContext()` im Worker, dort als `contextAttributes` von `onCanvas` angekommen; Default `{alpha: true}`, mit dem Attribut `no-alpha` `{alpha: false}`. Typ bleibt `@returns {Record<string, unknown>}`.
   - `:164-168` JSDoc von `getInitialWorkerAttributes()` neu (aufgenommener Nebenbefund): Properties, die in die erste Nachricht an den Worker einfließen, zusammen mit `canvas` und `contextAttributes`; der Worker bekommt sie in `parseMessageData()`. Default: keine. Typ bleibt `@returns {Record<string, unknown>}`.
   - `asNumberValue(attributeName, defaultValue)`: `@param {string} attributeName`, `@param {number} defaultValue`, `@returns {number}` — der Attributwert per `parseFloat`, der Default, wenn das Attribut fehlt oder keine Zahl ist.
   - `:214` (`// TODO adpoptedCallback ?`) **nicht** anfassen — eigener Eintrag in »Offene Befunde«, andere Ursache.

   `packages/rainbow-line/src/RainbowLineElement.js`:
   - `toCycleDirection` mit `@param {string | null} direction`, `toCycleColors` mit `@param {string | null} colors`.
   - `attributeChangedCallback(name, _oldValue, newValue)` mit `@param {string} name`, `@param {string | null} _oldValue`, `@param {string | null} newValue`.
   - `createWorker()` und den Worker-Pfad **nicht** anfassen (der `new URL('rainbow-line.worker.js', …)`-Eintrag in »Offene Befunde« hat eine andere Ursache und bleibt liegen).

   `packages/rainbow-line/src/RainbowLineWorkerDisplay.js`:
   - `let ctx = null;` mit `/** @type {OffscreenCanvasRenderingContext2D | null} */`.
   - Das Listener-Objekt an `on(display, {...})` über die neue Typedef kontextuell typisieren, statt jede Methode einzeln: `/** @import {EventListenerMethods} from '@spearwolf/eventize' */` und `/** @import {OffscreenWorkerDisplayEvents} from '@spearwolf/offscreen-display/worker.js' */`, dann `on(display, /** @type {EventListenerMethods<OffscreenWorkerDisplayEvents>} */ ({ … }));`. Damit sind `canvas`, `contextAttributes`, `now`, `canvasWidth`, `canvasHeight`, `pixelRatio` typisiert. Belegt: `on()` nimmt ein so typisiertes Listener-Objekt für ein nicht typisiertes Emitter-Objekt an. Scheitert der Weg an `getContext('2d', contextAttributes)`, dort `/** @type {CanvasRenderingContext2DSettings | undefined} */ (contextAttributes)` casten.
   - `parseMessageData(data)` mit `@param {Record<string, any>} data` (die Werte gehen in `toPositiveNumber`, das `number | string | null | undefined` erwartet; ein explizites `any` ist unter `noImplicitAny` zulässig).
   - `updateStrip(w, sliceWidth, sliceCount, repeat)` mit `@param {number}` für alle vier.

### B. `noImplicitAny` einschalten

1. `tsconfig.json`: `"noImplicitAny": true`. `strict` bleibt `false` — die Empfehlung des Audits nennt es als späteren, schrittweisen Schritt, nicht als Teil dieses Befunds.
2. `pnpm exec tsc -p tsconfig.json --noImplicitAny` meldet am Stand `8c34e81` 54 Fehler. Die in den Package-Quellen erledigt A7. Der Rest, mit der jeweils gemeinten Annotation:
   - `e2e/astro.config.mjs:10` (`({dir})`): das Integrationsobjekt `hostVendoredRainbowLine` mit `/** @type {import('astro').AstroIntegration} */` versehen, dann ist `dir` kontextuell `URL`.
   - `e2e/server.mjs:28` `resolveFile(urlPath)` → `@param {string} urlPath`; `:50` `MIME_TYPES[extname(file)]` → `MIME_TYPES` mit `/** @type {Record<string, string>} */`.
   - `e2e/tests/helpers.js:20`, `:29`, `:37`, `:39` — die Sammel-Arrays `problems` und `requests` mit `@type` ihres Elementtyps; `:42` (`[r, g, b]`) → `@param {[number, number, number]} …`.
   - `e2e/tests/npm-packages.spec.js:8` `readJson(url)` → `@param {URL} url`; `:12` `exportTargets(exportsField)` → Parameter- und `@returns {string[]}`-Annotation (rekursiv, deshalb braucht es die Rückgabe explizit); `:74` wird damit typisiert.
   - `packages/offscreen-display/scripts/buildPackage.mjs:23` und `packages/rainbow-line/scripts/buildPackage.mjs:34` `copyFile(src, dst)` → `@param {string}` für beide.
   - `scripts/makeBanner.mjs:6`, `scripts/makeBanner/banner.mjs:1`, `scripts/makeBanner/makeVersionWithBuild.mjs:5`, `scripts/makePackageJson.mjs:45` und `:58`, `scripts/makeTODO.mjs:59` und `:62`, `scripts/publishNpmPkg.mjs:35` → `@param` mit dem Typ, den die Aufrufer übergeben.
   - `testing/pixels.js:28` (TS2322, `number[][]` gegen `[number, number, number][]`) → `/** @type {[number, number, number][]} */ const pixels = [];` in `readRow`.
   Maßgeblich ist der Lauf von `pnpm typecheck` nach A: er muss mit 0 Fehlern enden. Keine `@ts-ignore`, kein `any` als Ausweg außer an der in A7 genannten Stelle.

### C. Folge aus Paket 3: `RainbowLine.astro` unter `strict`

`packages/astro-rainbow-line/RainbowLine.astro:30-34` — `App.Locals` kennt den
Symbol-Schlüssel nicht; unter `strict` (TS 7: Default) melden `:31` und `:32`
TS7053 (belegt mit Astros `App.Locals` aus `astro/dist/types/public/extendables.d.ts`).
Ersetzen durch eine typisierte Sicht, ohne `@ts-ignore`:

```ts
const RENDERED_SCRIPTS = Symbol.for('@spearwolf/astro-rainbow-line:scripts');
// Astro.locals does not know this key, so the set is read and written through a typed view
const locals = Astro.locals as {[RENDERED_SCRIPTS]?: Set<string>};
locals[RENDERED_SCRIPTS] ??= new Set();
const renderedScripts = locals[RENDERED_SCRIPTS];
```

Der Kommentar in `:29` (»Astro.locals lives as long as …«) bleibt. Beleg im
Report: die Probe unten im Arbeitsverzeichnis mit `node_modules/.bin/tsc`
(`strict: true`) — die alte Form rot (TS7053), die neue grün. Ein committeter
Regressionstest entfällt: das Repo hat keinen Typprüfer für `.astro`-Frontmatter,
und `@astrojs/check` wäre neue Werkzeug-Abhängigkeit außerhalb dieses Pakets.

```ts
declare global { namespace App { interface Locals {} } }
declare const Astro: {locals: App.Locals};
const RENDERED_SCRIPTS = Symbol.for('@spearwolf/astro-rainbow-line:scripts');
// alte Form: rot
Astro.locals[RENDERED_SCRIPTS] ??= new Set();
// neue Form: grün
const locals = Astro.locals as {[RENDERED_SCRIPTS]?: Set<string>};
locals[RENDERED_SCRIPTS] ??= new Set();
locals[RENDERED_SCRIPTS].add('x');
export {};
```

### D. READMEs

Konvention beachten: kein Rückblick auf den Vorzustand, keine Finding-IDs.

1. `packages/offscreen-display/README.md`:
   - Install (`:15`): `npm i @spearwolf/offscreen-display @spearwolf/eventize` — ohne `-D`, es ist eine Laufzeit-Abhängigkeit; eventize braucht der Worker für `on()`.
   - Nummerierung der Schritte richten (`:41` und `:54` sind beide »3.«).
   - Worker-Beispiel (`:58-78`): `import {on} from '@spearwolf/eventize';` und `on(display, {...})` statt `display.on({...})`; `onFrame` destrukturiert `pixelRatio` mit und erwähnt in einem Kommentar, dass `canvasWidth`/`canvasHeight` physische Pixel sind.
   - Neuer Abschnitt zur API, knapp, als Listen:
     - `OffscreenDisplay` (Main-Thread): Konstruktor mit `initialHTML` — die Canvas muss ihre angezeigte Größe aus CSS bekommen (die Default-Styles strecken sie über das Element), weil ihre Pixelgröße der angezeigten Größe in physischen Pixeln folgt; Hooks `createWorker()` (Pflicht), `getContextAttributes()` (Default `{alpha: true}`, Attribut `no-alpha` → `{alpha: false}`), `getInitialWorkerAttributes()`, `queryCanvasElement()`; `asNumberValue(name, defaultValue)`; Properties `worker`, `canvas`; Lebenszyklus: Worker startet beim Verbinden, beim Trennen geht `{isConnected: false}` an den Worker und er wird einen Animation Frame später beendet (`dispose()`), ein späteres Verbinden startet einen frischen Worker mit frischer Canvas; `dispose()` ist öffentlich und idempotent.
     - `OffscreenWorkerDisplay` (Worker): `parseMessageData(data)` an `self`-`message` hängen; Events `onCanvas(display, contextAttributes)`, `onInit(display)`, `onResize(display)` — diese drei retained, späte Listener bekommen sie noch — und `onFrame(display)` je Animation Frame, nur verbunden, erst nach der ersten Größe und bei einer Canvas-Größe über 0; Properties `canvas`, `canvasWidth`/`canvasHeight` (physische Pixel), `pixelRatio` (physische zu CSS-Pixeln), `now` (Sekunden), `isConnected`, `ready`; `destroy()`; ein werfender Listener beendet den Frame-Loop nicht, der Fehler kommt als `error`-Event am `Worker` an.
     - Nachrichten vom Main-Thread: `{canvas, contextAttributes, …getInitialWorkerAttributes()}`, `{isConnected}`, `{resize: {width, height, pixelRatio}}`.
     - TypeScript: die Deklarationen liegen bei; Listener typisiert man mit `EventListenerMethods<OffscreenWorkerDisplayEvents>` aus `@spearwolf/eventize` bzw. `@spearwolf/offscreen-display/worker.js` (kurzes Beispiel); worker und Element müssen dieselbe eventize-Kopie (Major 6) verwenden.
2. `packages/rainbow-line/README.md`:
   - `:1` Titel als `# rainbow-line` (die Schwesterpakete und die eigenen `##`-Abschnitte setzen eine H1 voraus).
   - Abschnitt zur Nutzung über npm: `npm i rainbow-line`, dann `import 'rainbow-line';` — der Default-Export `bundle.js` ist eine einzelne Datei mit eingebettetem Worker und definiert `<rainbow-line>`; `rainbow-line/rainbow-line.js` lädt seinen Worker aus `rainbow-line.worker.js` im selben Verzeichnis, beide Dateien gehören zusammen ausgeliefert. Die Quell-Subpfade `./RainbowLineElement.js` und `./RainbowLineWorkerDisplay.js` **nicht** dokumentieren — ihr Worker-Pfad steht als offener Befund in der Queue.
   - `:38` `mailto`-Betreff auf `?subject=[GitHub]%20rainbow-line` (aufgenommener Nebenbefund).
   - Attribut-Tabelle (`:17-27`, von Paket 3) gegen den Code prüfen, sonst lassen.
3. `packages/astro-rainbow-line/README.md` neu schreiben:
   - Nutzung: `import RainbowLine from '@spearwolf/astro-rainbow-line';` und `<RainbowLine />`.
   - Props-Tabelle aus `RainbowLine.astro:2-18`: `shadow` (`false`, zeichnet eine zweite, weichgezeichnete Linie darunter), `colorSliceWidth` (`10`), `sliceCycleTime` (`7`), `cycleDirection` (`'right'`, oder `'left'`), `cycleColors` (String oder Array von CSS-Farben), `cycleColorsRepeat`; Verweis auf die Attribut-Tabelle im rainbow-line-README für Wertebereiche.
   - CSS Custom Properties aus `:59-69`: `--rainbow-line-height` (`4px`), `--rainbow-shadow-height` (`12px`), `--rainbow-shadow-opacity` (`0.4`).
   - Skript: die Seite muss `rainbow-line-v0.5.0.js` (Link auf die Datei im Package) unter ihrem `BASE_URL` als `js/rainbow-line-v0.5.0.js` ausliefern — ohne den doppelten Slash aus `:5` (aufgenommener Nebenbefund; der Code setzt den Slash nur, wenn `BASE_URL` nicht auf `/` endet, `RainbowLine.astro:27`); `RAINBOW_LINE_JS` ändert den Pfad unterhalb von `BASE_URL`; der `<script>`-Tag erscheint einmal pro Seite (`:8` bleibt sinngemäß).
   - Den Verweis auf `CHANGELOG.md` behalten.

### E. Release-Stand

Erst nach A bis D, damit das vendored Bundle den fertigen Code trägt.

1. Zuerst den Regressionstest für den vendored Stand schreiben (E5), bei den alten Versionen laufen lassen (grün: 0.4.0 gegen 0.4.0), dann erst bumpen.
2. Versionen (Entscheidung BUILD-001 im Plan): `packages/offscreen-display/package.json` `0.3.0`, `packages/rainbow-line/package.json` `0.5.0`, `packages/astro-rainbow-line/package.json` `1.4.0` (Minor: neuer Default-Pfad des Skripts, Props und Verhalten unverändert — wie der Sprung auf 1.3.0 mit rainbow-line 0.4.0). Nach dem Bump von rainbow-line E5 laufen lassen: **rot** (vendored ist noch 0.4.0) — diesen Lauf in den Report.
3. Vendored Bundle: `pnpm nx build rainbow-line`, dann `packages/rainbow-line/bundle.js` nach `packages/astro-rainbow-line/rainbow-line-v0.5.0.js` kopieren (das vendored File ist das self-contained `bundle.js`, belegt über den eingebetteten Blob-Worker in `rainbow-line-v0.4.0.js`), `packages/astro-rainbow-line/rainbow-line-v0.4.0.js` löschen (einfaches `rm`, nicht `git rm`). Banner prüfen: `@version 0.5.0+vanilla.<Datum>`. `RainbowLine.astro:25` Default auf `'js/rainbow-line-v0.5.0.js'`. Das README aus D3 nennt schon 0.5.0. E5 jetzt grün.
4. Changelogs, Datum `2026-09-22`, jeweils über dem datierten Abschnitt ein leeres `## [Unreleased]` stehen lassen; Abschnittsreihenfolge Added, Changed, Fixed (Keep a Changelog):
   - `packages/offscreen-display/CHANGELOG.md`: `## [0.3.0] - 2026-09-22` aus dem jetzigen `[Unreleased]`, ergänzt um
     - Added: type declarations for both entry points (`dist/types/`), referenced by `types` in `exports`; `OffscreenWorkerDisplayEvents` describes the listener arguments of the events, `OffscreenDisplayMessage` the messages from the main thread
     - Changed: **breaking**: depends on `@spearwolf/eventize` 6 and `@spearwolf/signalize` 1 — a worker adds its listeners with `on(display, {...})` from the same `@spearwolf/eventize` 6; two eventize majors on one display throw (Quelle: eventize-README zu `getEventizeProtocol()`; der Upgrade-Commit `c8cc2d0` steht bisher in keinem Changelog)
     - Changed: `OffscreenWorkerDisplay#ready` is always a boolean (die Literaltypen der statischen Event-Namen bekommen keinen eigenen Eintrag — sie ändern keinen Laufzeitwert und gehören zum Added-Eintrag der Deklarationen)
     - Changed: the README documents the lifecycle, the events, the messages and the TypeScript usage
   - `packages/rainbow-line/CHANGELOG.md`: `## [0.5.0] - 2026-09-22` aus `[Unreleased]`, ergänzt um
     - Added: type declarations for the source modules `./RainbowLineElement.js` and `./RainbowLineWorkerDisplay.js`
     - Changed: upgrade dependencies — `@spearwolf/eventize` to `^6.2.0`, `@spearwolf/offscreen-display` to `^0.3.0`
     - Changed: the README shows how to use the package from npm
     - `:34` im Abschnitt 0.4.0: `^0.3.0` → `^0.2.0` (npm: `rainbow-line@0.4.0` hat `"@spearwolf/offscreen-display": "^0.2.0"`, belegt mit `npm view`)
     - Vergleichslinks `:68-72` (aufgenommener Nebenbefund): `unreleased` → `compare/rainbow-line-v0.5.0...HEAD`, neu `[0.5.0]` → `compare/rainbow-line-v0.4.0...rainbow-line-v0.5.0`, neu `[0.4.0]` → `compare/rainbow-line-v0.3.0...rainbow-line-v0.4.0`, `[0.3.0]` und `[0.2.1]` bleiben. Die Tags `rainbow-line-v0.4.0` und `rainbow-line-v0.5.0` gibt es noch nicht (`git tag -l` endet bei `rainbow-line-v0.3.0`); sie setzt der Nutzer — nicht im Paket taggen.
   - `packages/astro-rainbow-line/CHANGELOG.md`: `## [1.4.0] - 2026-09-22` aus `[Unreleased]`, ergänzt um
     - Changed: update the `rainbow-line` web component to `0.5.0` — the default script path is `js/rainbow-line-v0.5.0.js`
     - Changed: the README documents the props, the css custom properties and where to host the script
     - Fixed: the component type-checks in projects with `strict` TypeScript settings
5. Regressionstest in `e2e/tests/npm-packages.spec.js` (läuft nur im Chromium-Projekt): `test('astro-rainbow-line vendors the rainbow-line bundle of the current rainbow-line version', …)`:
   - `version` aus `packages/rainbow-line/package.json`
   - in `packages/astro-rainbow-line/` ist `rainbow-line-v${version}.js` die einzige Datei auf `/^rainbow-line-v.+\.js$/`
   - ihr Inhalt beginnt mit dem Banner wie im bestehenden Banner-Test (`@version ${version}+vanilla.\d{8}`)
   - `RainbowLine.astro` enthält `'js/rainbow-line-v${version}.js'`
   - `packages/astro-rainbow-line/README.md` nennt `rainbow-line-v${version}.js` und keine andere `rainbow-line-v<Zahl>`-Version
   Warum e2e und nicht der Vitest-Test `packages/astro-rainbow-line/test/RainbowLine.test.js:84`: astro-rainbow-line hängt im nx-Graphen nicht an rainbow-line, ein Versionssprung dort verwirft den Cache des astro-Tests nicht; das e2e-Projekt hängt an allen drei Packages.

### F. Konsumentenprüfung der Typen (Regressionstest zu A)

Test in `e2e/tests/npm-packages.spec.js`: `test('the published type declarations serve a typescript consumer', …)`. Vor A rot (TS7016 an den benannten Imports), danach grün — den roten Lauf in den Report. Reihenfolge: F1–F2 vor A schreiben und rot sehen.

1. Fixture `e2e/types/consumer.ts` (committet; Biome prüft sie, `pnpm typecheck` nicht — sie braucht gebaute Packages). Pflichtinhalte, Syntax frei:
   - `import 'rainbow-line';` (Side-Effect)
   - `import {OffscreenDisplay} from '@spearwolf/offscreen-display';` und eine Subklasse mit `override createWorker(): Worker` und `override getInitialWorkerAttributes()`; `const worker: Worker | undefined = element.worker;`
   - `import {OffscreenWorkerDisplay, type OffscreenWorkerDisplayEvents} from '@spearwolf/offscreen-display/worker.js';` und `import {type EventListenerMethods, on} from '@spearwolf/eventize';` — ein `EventListenerMethods<OffscreenWorkerDisplayEvents>`-Objekt mit `onCanvas({canvas})` und `onFrame({now, canvasWidth, canvasHeight, pixelRatio})`, dessen Werte an `number`-Variablen gehen; `on(display, listeners)`
   - `display.parseMessageData({resize: {width: 640, height: 480, pixelRatio: 2}});`, `const frameEvent: 'onFrame' = OffscreenWorkerDisplay.Frame;`, `const ready: boolean = display.ready;`
   - der Beweis gegen `any`: `// @ts-expect-error canvasWidth is a number` vor `const notAString: string = display.canvasWidth;` — wäre die Property `any`, meldet TypeScript die unbenutzte Direktive
   - `import {RainbowLineElement} from 'rainbow-line/RainbowLineElement.js';` mit einer Subklasse, `import {parseMessageData} from 'rainbow-line/RainbowLineWorkerDisplay.js';` mit einem Aufruf
   - alles Deklarierte exportieren, damit Biome keine unbenutzten Variablen meldet
2. Der Test baut in `mkdtempSync(join(tmpdir(), 'visual-fx-types-'))` einen Konsumenten auf: `package.json` `{"type": "module"}`; `tsconfig.json` mit `strict: true`, `module` und `moduleResolution` `"nodenext"`, `target: "es2023"`, `lib: ["es2023", "dom", "dom.iterable"]`, `types: []`, `skipLibCheck: false`, `preserveSymlinks: true`, `noEmit: true`, `include: ["consumer.ts"]`; `consumer.ts` hineinkopieren; Symlinks `node_modules/@spearwolf/offscreen-display` → `packages/offscreen-display/.npm-pkg`, `node_modules/rainbow-line` → `packages/rainbow-line/.npm-pkg`, `node_modules/@spearwolf/eventize` → `realpathSync` von `packages/offscreen-display/node_modules/@spearwolf/eventize`. `preserveSymlinks` hält die Auflösung im Konsumenten-`node_modules`, wie nach einem echten `npm install`; ohne es löst TypeScript die Imports der rainbow-line-Deklarationen über `packages/rainbow-line/node_modules` auf und sieht zwei verschiedene `OffscreenDisplay`-Klassen.
3. `tsc` aufrufen: Pfad über `createRequire(import.meta.url).resolve('typescript/package.json')` plus dessen `bin.tsc` (`./bin/tsc`, ein Node-Skript), `execFileSync(process.execPath, [tscPath, '-p', dir], {encoding: 'utf8'})`; bei Fehler die Ausgabe von `tsc` in die Assertion-Meldung. Temp-Verzeichnis im `finally` mit `rmSync(dir, {recursive: true, force: true})` entfernen.
   Belegt in Zug 0: eventizes eigene Deklarationen bestehen unter genau diesen Einstellungen (`strict`, `nodenext`, `skipLibCheck: false`), und `on()` nimmt ein `EventListenerMethods<…>`-Objekt an. `skipLibCheck` bleibt `false`, denn geprüft werden sollen gerade die ausgelieferten `.d.ts`.
4. Der bestehende Test `contains every file its package.json refers to` erfasst die neuen `types`-Ziele von selbst (`exportTargets` flacht verschachtelte Bedingungen ab).

### G. Doku im Repo und Prüfschritte

1. `CLAUDE.md` mitziehen: `:19` (`pnpm typecheck` jetzt mit `noImplicitAny`), `:32` (`tsconfig.json` bleibt für `pnpm typecheck`; je Package ein `tsconfig.build.json`, das davon erbt und im `build` die Deklarationen nach `dist/types/` schreibt, rainbow-line nur für die Quell-Subpfade), `:50` (Build-Ausgabe von offscreen-display um `dist/types/`), `:52-56` (rainbow-line: Typen in `dist/types/`), `:65` (`buildPackage.mjs` kopiert `dist/types`), Abschnitt »Tests« um die Konsumentenprüfung der Typen und die Versionsprüfung des vendored Bundles in `npm-packages.spec.js`.
2. nx-Outputs prüfen: `pnpm clean && pnpm build`, dann noch einmal `pnpm clean && pnpm build` — der zweite Build kommt aus dem Cache und muss `packages/offscreen-display/dist/types/` und `packages/rainbow-line/dist/types/` wiederherstellen (`ls`). Danach `pnpm nx run-many -t buildNpmPkg` und `ls packages/*/.npm-pkg/dist/types`.
3. Verify: `E2E_SKIP_WEBKIT=1 pnpm verify`, Exit 0.

## Entscheidungen aus Zug 0

- **Kein Teilen des Pakets.** Das Paket ist um vier kleine Nebenbefunde und eine Folge gewachsen, aber der Release-Teil muss ohnehin nach allen Code-Änderungen stehen (das vendored Bundle trägt den fertigen Code, die Changelogs die Typen), und die Schleife führt das Paket unter der ID 4. Die Reihenfolge A–G im Vorgehen trägt die Abhängigkeit.
- **Typen über `tsc`-Emit aus JSDoc**, wie die Audit-Empfehlung sagt — TypeScript 7.0.2 kann das für JS (belegt). Keine handgeschriebenen `.d.ts`: sie liefen dem Code davon.
- **Klassenfelder statt `this.x;`-Deklarationen** für die Signal-Properties von `OffscreenWorkerDisplay` — die Konstruktor-Form ignoriert TypeScript 7, die Felder tragen und ändern das Laufzeitverhalten nicht (Probe in Node: Accessor, aufzählbar, Signal-Werte).
- **Event-Signaturen als exportierte Typedef** `OffscreenWorkerDisplayEvents` statt eines typisierten Emitters. Abweichung von einer möglichen Lesart der Empfehlung: ein typisierter Emitter bräuchte Interface-Verschmelzung (TS-only) oder `extends Eventize` (Laufzeitumbau, andere API).
- **`types` nur für Module mit Exporten.** Die Side-Effect-Einstiege von rainbow-line brauchen keine (belegt: TS 7 akzeptiert den Side-Effect-Import eines untypisierten Moduls).
- **`noImplicitAny` repo-weit, `strict` nicht.** Die Empfehlung staffelt `strict` ausdrücklich danach; 54 Stellen sind der Umfang dieses Pakets.
- **Konsumentenprüfung als e2e-Test gegen `.npm-pkg`**, nicht als Teil von `pnpm typecheck`: `verify` läuft `typecheck` vor `build`, die Deklarationen gibt es erst danach; und geprüft werden soll, was veröffentlicht wird.
- **Versionsprüfung des vendored Bundles im e2e**, nicht im Vitest-Test des astro-Packages — nx-Cache, siehe E5.
- **astro-rainbow-line 1.4.0** — die Entscheidung im Plan sagt »passend nachgezogen«; Minor wie beim Sprung auf 1.3.0.
- **Die Folge aus Paket 3 wird hier behoben, nicht als eigenes Paket geschnitten.** Sie liegt im Gegenstand von TYPES-001 (Typen der ausgelieferten Packages für TS-Konsumenten), in einer Datei, die dieses Paket für den Default-Pfad ohnehin ändert, und muss vor dem Datieren des astro-Changelogs behoben sein; ein eigenes Paket müsste vor diesem laufen und kostete drei Prozesse für fünf Zeilen. Derselbe Weg wie die Folge aus Paket 2 (vendored Bundle), die Paket 2 und Paket 5 hierher gegeben haben.

## Abgleich je Finding

- **TYPES-001 — unverändert.** `packages/offscreen-display/package.json:19-26` und `packages/rainbow-line/package.json:19-38`: `exports` ohne `types`, kein Top-Level-`types`. `tsconfig.json:15-16`: `"strict": false`, `"noImplicitAny": false`. `packages/rainbow-line/src/RainbowLineElement.js:77`: `attributeChangedCallback(name, _oldValue, newValue)` ohne Typen. Unter `--noImplicitAny` 54 Fehler (Liste in B).
- **DX-001 — umgeformt.** Offen: `packages/offscreen-display/README.md:65` `display.on({`, `:15` `npm i -D`, doppelte »3.« (`:41`, `:54`), keine Beschreibung von `dispose()`, `destroy()`, physischen Pixeln und `pixelRatio` (Hinweis aus Zug 0 von Paket 2). Erledigt: die Attribut-Tabelle im rainbow-line-README (Paket 3, `packages/rainbow-line/README.md:17-27`) und `packages/astro-rainbow-line/CHANGELOG.md` (Paket 1). Neu gesehen: das astro-README beschreibt weder Props noch CSS Custom Properties; der Titel des rainbow-line-README ist eine H3.
- **BUILD-001 — unverändert, ein Teil verschoben.** Versionen `0.2.0` (`packages/offscreen-display/package.json:4`), `0.4.0` (`packages/rainbow-line/package.json:4`), `1.3.0` (astro); npm kennt offscreen-display bis 0.2.0 und rainbow-line bis 0.4.0 (`npm view`). `[Unreleased]` in allen drei Changelogs. Die `^0.3.0`-Behauptung ist von `:9`/`:21` nach `packages/rainbow-line/CHANGELOG.md:34` gewandert. Vendored `packages/astro-rainbow-line/rainbow-line-v0.4.0.js` trägt `@version 0.4.0+vanilla.20241212`, also den Code vor Paket 2 und 3. Der Test, auf den das Audit zielt, ist `packages/astro-rainbow-line/test/RainbowLine.test.js:84` — er vergleicht Dateiname und Banner, nicht die rainbow-line-Version.

## Triage

Folgen:
- `packages/astro-rainbow-line/RainbowLine.astro:31-32` (aus Paket 3) — **echte Folge** von Paket 3: neue Zeilen, eigene Ursache (Symbol-Index auf `App.Locals`). Belegt: TS7053 unter `strict`. → in dieses Paket, Abschnitt C; Begründung unter »Entscheidungen aus Zug 0«.
- `packages/astro-rainbow-line/rainbow-line-v0.4.0.js` (aus Paket 2) — Teil von BUILD-001, Abschnitt E3.

Aus »Offene Befunde«:
- `OffscreenDisplay.js:81` und `:167` → **aufgenommen**: dieselbe Ursache wie TYPES-001 (JSDoc der öffentlichen Hooks unvollständig), genau die Kommentare, die A7 neu schreibt.
- `packages/rainbow-line/README.md:38` → **aufgenommen**: README-Inhalt, der nicht zum Package passt — die Ursache von DX-001; der rainbow-line-Teil von DX-001 ist genau diese Prüfung.
- `packages/rainbow-line/CHANGELOG.md` Vergleichslinks → **aufgenommen**: steht wörtlich in der Empfehlung von BUILD-001 (»den Vergleichs-Link für 0.4.0 ergänzen«).
- `packages/astro-rainbow-line/README.md:5` → **aufgenommen**: das README beschreibt einen Pfad, den der Code (`RainbowLine.astro:27`) so nicht baut — Ursache von DX-001; dieselbe Zeile ändert E für die Version ohnehin.
- `OffscreenDisplay.js:214` (`adpoptedCallback`) → **bleibt** in der Queue: Tippfehler in einem TODO, keine gemeinsame Ursache.
- `RainbowLineElement.js` Worker-URL → **bleibt** in der Queue: Veröffentlichungs-Layout der Quell-Subpfade, weder Typen noch Doku noch Release-Stand. Hinweis für den Drain steht im Plan unter Paket 4.

## Findings im Volltext

**TYPES-001 · medium · packages/offscreen-display/package.json:14** (weitere Fundstellen: `packages/rainbow-line/package.json:14`, `tsconfig.json:15`, `packages/rainbow-line/src/RainbowLineElement.js:56`) — Typdeklarationen mitliefern und `checkJs` schärfen
Keines der Packages exportiert `types`; TypeScript-Konsumenten sehen `OffscreenDisplay`, `OffscreenWorkerDisplay` und `RainbowLineElement` als `any` und müssen die Subclass-Hooks `createWorker()`, `getContextAttributes()` und die Event-Signaturen aus dem Quelltext raten. Die JSDoc-Kommentare sind vorhanden, werden aber nicht ausgeliefert. Intern läuft `tsc` mit `strict: false` und `noImplicitAny: false`, dadurch bleiben Parameter wie `attributeChangedCallback(name, _oldValue, newValue)` oder `parseMessageData(data)` untypisiert und der Check fängt nur grobe Fehler.
Empfehlung: Ein zweites `tsconfig.build.json` mit `declaration: true`, `emitDeclarationOnly: true`, `outDir: dist/types` je Package; `types` in `exports` (`".": {"types": "./dist/types/index.d.ts", "default": ...}`) und im `buildPackage.mjs` kopieren. JSDoc-Typen an den öffentlichen Methoden vervollständigen. Anschließend `noImplicitAny: true` einschalten und die verbleibenden Stellen annotieren; `strict` kann danach schrittweise folgen.

**DX-001 · medium · packages/offscreen-display/README.md:65** (weitere Fundstellen: `packages/offscreen-display/README.md:16`, `packages/rainbow-line/README.md:8`, `packages/astro-rainbow-line/README.md:6`) — READMEs an eventize 6 und den Funktionsumfang angleichen
Das Quickstart-Beispiel in `offscreen-display/README.md` ruft `display.on({...})` auf. Seit dem Umstieg auf eventize 6 wird die Instanz mit `eventize(this)` funktional eventized; die Methode `.on` existiert nicht, das Beispiel endet mit `TypeError: display.on is not a function`. Der eigene Code nutzt korrekt `on(display, {...})`. Daneben empfiehlt das README `npm i -D` für eine Laufzeit-Abhängigkeit. Das rainbow-line-README dokumentiert weder `cycle-colors`, `cycle-colors-repeat` noch die Bruch-Semantik von `color-slice-width` — die Features stehen nur im Changelog und in `index.html`. Das astro-README führt seinen Changelog inline statt in einer `CHANGELOG.md` wie die Schwesterpakete.
Empfehlung: Quickstart auf `import {on} from '@spearwolf/eventize'` + `on(display, {...})` umstellen, `-D` streichen. Im rainbow-line-README eine Attribut-Tabelle mit Wertebereichen und Defaults ergänzen (die Wertebereiche ergeben sich aus CORR-001). Für astro-rainbow-line eine `CHANGELOG.md` anlegen.

**BUILD-001 · medium · packages/offscreen-display/CHANGELOG.md:9** (weitere Fundstellen: `packages/rainbow-line/CHANGELOG.md:9`, `packages/rainbow-line/CHANGELOG.md:21`, `packages/offscreen-display/package.json:4`, `packages/rainbow-line/package.json:4`) — Unreleased Fixes veröffentlichen und Changelog-Versionen mit npm abgleichen
Beide Changelogs führen unter »Unreleased« echte Bugfixes: `offscreen-display` stoppte den Frame-Loop nach `{isConnected: false}` nicht, `rainbow-line` hatte einen `./rainbow-line.worker.js`-Export auf eine nicht existierende Datei. Die `version`-Felder stehen unverändert auf 0.2.0 und 0.4.0, also publiziert der CI-Lauf nichts — npm liefert weiter die fehlerhaften Stände (`npm view`: offscreen-display 0.1.2 und 0.2.0, rainbow-line 0.4.0). Zusätzlich behauptet der rainbow-line-Changelog für 0.4.0 ein Upgrade auf `@spearwolf/offscreen-display ^0.3.0`; diese Version hat es nie gegeben. Der Eintrag für die »Comparing changes«-Links endet bei 0.3.0.
Empfehlung: Versionen bumpen (offscreen-display 0.2.1, rainbow-line 0.4.1), die Changelog-Abschnitte datieren, den 0.3.0-Verweis korrigieren und den Vergleichs-Link für 0.4.0 ergänzen. Anschließend das vendored `rainbow-line-v0.4.1.js` in `astro-rainbow-line` nachziehen (Datei, Default-Pfad in `RainbowLine.astro`, README) — der Test »loads the rainbow-line script from the vendored file« schlägt sonst nicht an, weil er nur Datei gegen Banner prüft, nicht gegen die aktuelle rainbow-line-Version.
(Die Versionsnummern der Empfehlung gelten nicht: der Plan hat unter »Entscheidungen« Minor-Bumps auf 0.3.0 und 0.5.0 festgelegt.)

## Urteil des Reviewers (Zug 3)

Erfüllung:
- TYPES-001 — behoben: `types` als erste Bedingung in `packages/offscreen-display/package.json:19,22,26` und bei den zwei Quell-Subpfaden in `packages/rainbow-line/package.json`; `tsconfig.build.json` je Package; `buildPackage.mjs` kopiert `dist/types`; `tsconfig.json:18` `noImplicitAny: true`; Deklarationen ohne implizites `any`; Konsumentenprüfung `e2e/tests/npm-packages.spec.js:141` grün, `@ts-expect-error` gegen `any`
- DX-001 — behoben: `packages/offscreen-display/README.md:15` ohne `-D`, `:68` `on(display, …)`, Schritte 1–5, API-Abschnitt ab `:89`, TypeScript ab `:123`; rainbow-line-README H1 und »Usage with npm« (`:17`); astro-README mit Props, CSS Custom Properties, Skript-Hosting
- BUILD-001 — behoben: Versionen 0.3.0/0.5.0/1.4.0, Changelogs datiert, `packages/rainbow-line/CHANGELOG.md:44` `^0.2.0`, vendored 0.5.0 byte-gleich mit `bundle.js`, `RainbowLine.astro:25` Default-Pfad, Regressionstest `npm-packages.spec.js:120`
- Folge aus Paket 3 — behoben: `packages/astro-rainbow-line/RainbowLine.astro:31-34`, typisierte Sicht, Probe unter `--strict` grün
- Nebenbefund JSDoc der Hooks — behoben: `OffscreenDisplay.js:79-83`, `:172-177`
- Nebenbefund `mailto` — behoben: `packages/rainbow-line/README.md:52`
- Nebenbefund Vergleichslinks — behoben: `packages/rainbow-line/CHANGELOG.md:80-82`
- Nebenbefund doppelter Slash — behoben: `packages/astro-rainbow-line/README.md:39-41`

Kleine Befunde (keine Runde):
1. `packages/astro-rainbow-line/CHANGELOG.md:23` — »Fixed: the component type-checks … `strict`« beschreibt einen Fehler, den kein Release hatte (der Symbol-Index kam mit c667c20 in denselben unveröffentlichten Abschnitt); nach Keep a Changelog entbehrlich. Von E4 so vorgegeben.
2. `packages/rainbow-line/CHANGELOG.md:81-82` — Links auf die noch nicht gesetzten Tags `rainbow-line-v0.4.0`/`-v0.5.0`; geplant, der Nutzer taggt (steht im Plan unter Paket 4).
3. `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:3-23` — TypeScript 7 hängt die Beschreibungen der beiden `@typedef` in der `.d.ts` nicht an die Typen; rein kosmetisch (Hover).
4. `packages/rainbow-line/src/RainbowLineWorkerDisplay.js` `parseMessageData` — `Record<string, any>` geht in die veröffentlichte `.d.ts`; von A7 erlaubt, enger wäre `Record<string, number | string | null | undefined>`.
5. Commit-Betreff rund 117 Zeichen, länger als üblich im `git log`, im Ton passend.

Abweichungen des Implementierers: das astro-README nannte bis E3 noch 0.4.0 (sonst wäre E5 vor dem Bump rot gewesen); `exportTargets` mit rekursivem Typ `ExportsField` statt `any`; Annotation in `testing/pixels.js` sitzt in `decodePngRow`; rainbow-line-Changelog 0.5.0 in Reihenfolge Added, Changed, Fixed; `CLAUDE.md`-Absatz zu astro-rainbow-line ohne den Doppel-Slash-Pfad.

Urteile an den Nebenbefunden (Scope-Regel »alles, jede Severity«): alle fünf `→ Scope`, low, vorbestehend (gegen `e57a13c` nachgesehen); keine gemeinsame Ursache mit einem offenen Paket — es gibt keines mehr, sie gehen an die Drain-Runde.
