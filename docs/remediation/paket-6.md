# Paket 6 — Nebenbefunde aus der Queue: Worker-Pfad des Quell-Subpfads, Test-Server, Doku-Reste

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: keine aus dem Audit — die sieben offenen Einträge aus »Offene Befunde« (Drain-Runde), dazu ein in Zug 0 gefundener Nebenbefund mit derselben Ursache wie `parseMessageData` (siehe Abgleich)
- Ziel: Die in diesem Lauf aufgefallenen Nebenbefunde sind behoben; rainbow-line-Code-Änderungen landen im datierten 0.5.0-Changelog-Abschnitt, und das vendored `rainbow-line-v0.5.0.js` wird aus dem neuen `bundle.js` kopiert.
- Modell: mittlere Stufe (`sonnet`)
- Effort: medium
- Dateien:
  - `packages/rainbow-line/scripts/buildPackage.mjs`, `packages/rainbow-line/src/RainbowLineElement.js`, `packages/rainbow-line/src/RainbowLineWorkerDisplay.js`, `packages/rainbow-line/test/rainbowLineBehaviour.js`, `packages/rainbow-line/README.md`, `packages/rainbow-line/CHANGELOG.md`
  - `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`, `packages/offscreen-display/src/lib/main/OffscreenDisplay.js`, `packages/offscreen-display/test/offscreen-display.test.js`, `packages/offscreen-display/README.md`, `packages/offscreen-display/CHANGELOG.md`
  - `packages/astro-rainbow-line/rainbow-line-v0.5.0.js` (nur neu kopiert)
  - `e2e/server.mjs`, `e2e/resolveFile.mjs` (neu), `e2e/tests/server.spec.js` (neu), `e2e/tests/npm-packages.spec.js`, `e2e/playwright.config.js`
  - `CLAUDE.md`
- Vorgehen: siehe unten, Schritte 1–6 in dieser Reihenfolge. Jeder Korrektheitsfehler (Schritte 1, 2, 4) zuerst mit rotem Regressionstest, dann der Fix.
- Verify: `E2E_SKIP_WEBKIT=1 pnpm verify && cmp packages/rainbow-line/bundle.js packages/astro-rainbow-line/rainbow-line-v0.5.0.js`
- Commit: `ship the worker of rainbow-line's source subpath, ignore worker messages that are not objects, harden the e2e server, correct doc details`
- Verlauf:
  - 2026-09-22 Zug 0: Detailplan steht · alle sieben Queue-Einträge unverändert vorhanden (`adpoptedCallback` von `OffscreenDisplay.js:214` nach `:229` gewandert, landet unminifiziert auch in `dist/offscreen-display.js:197`; die übrigen an ihren Zeilen: `RainbowLineElement.js:66`, `RainbowLineWorkerDisplay.js:97`, `e2e/server.mjs:36`/`:49`, `CLAUDE.md:32`/`:68`, `offscreen-display/README.md:5`) · `.npm-pkg/src/` enthält `attributes.js`, `RainbowLineElement.js`, `RainbowLineWorkerDisplay.js`, keinen Worker — der 404 ist belegt · neu aufgenommen: `OffscreenWorkerDisplay.js:196` (`'isConnected' in data` wirft bei `42`/`'text'`/`true`), vorbestehend laut `git show e57a13c` (`:109`), gleiche Ursache · keine offenen Folgen im Plan · `main` ist 5 Commits vor `origin/main`, also nichts veröffentlicht: Changelog-Einträge in die datierten Abschnitte 0.3.0/0.5.0
  - 2026-09-22 Zug 1: Implementierer beauftragt (`sonnet`, effort medium), Brief `paket-6.impl-1.brief.txt`, Report nach `paket-6.impl-1.json`
  - 2026-09-22 Zug 2: erster Prozess endete ohne Report (Zug mit laufendem Hintergrundjob beendet), per `--resume` derselben Session fortgesetzt → `paket-6.impl-1-versuch-2.json` · Status FERTIG · 16 Dateien geändert, neu `e2e/resolveFile.mjs`, `e2e/tests/server.spec.js` · rote Läufe belegt (`p6-step1a-red.log`, `p6-step2a-offscreen-red.log`, `p6-step2a-rainbowline-red.log`, `p6-step4b-red.log`) · Arbeitsbaum schmutzig · eigener Verify ohne nx-Cache exit=0 (`paket-6.verify.log`)
  - 2026-09-22 Zug 3: Reviewer (`sonnet`, effort medium) → freigeben, alle acht Befunde behoben, keine Qualitätsbefunde · Diff `paket-6.diff` · Report `paket-6.review-1.json` · Arbeitsbaum danach unverändert (Diff byte-gleich)
  - 2026-09-22 Zug 4: keine Runde nötig
  - 2026-09-22 Zug 5: committet 999823e (18 Dateien, Trailer `Remediation-Run: 2026-09-22`), Verify-Log `paket-6.verify.log` exit=0

## Entscheidungen in Zug 0

- **Worker des Quell-Subpfads: den Quell-Worker veröffentlichen, nicht die URL umbiegen.** `new URL('…', import.meta.url)` in `src/RainbowLineElement.js` muss in drei Lagen stimmen: im Quellbaum (Vite-Dev-Server über `index.html`), im gebündelten `rainbow-line.js` an der Paketwurzel (dort zeigt dieselbe URL auf das gebaute `rainbow-line.worker.js` daneben — funktioniert heute) und im veröffentlichten `.npm-pkg/src/RainbowLineElement.js`. Nur die dritte Lage bricht. Ein `../rainbow-line.worker.js` würde die zweite brechen (aus der Paketwurzel hinaus). Also bekommt die dritte Lage ihre Datei: `src/rainbow-line.worker.js` geht in `COPY_FILES`. Der Quell-Subpfad ist ohnehin für Bundler gedacht (er importiert `@spearwolf/offscreen-display` als nackten Specifier), und Bundler bündeln die veröffentlichte Worker-Quelle samt ihren Imports.
- **`./` vor dem Worker-Namen.** `new URL('rainbow-line.worker.js', import.meta.url)` und `new URL('./rainbow-line.worker.js', import.meta.url)` sind zur Laufzeit identisch. Die Worker-Erkennung von Vite und webpack ist mit `new Worker(new URL('./worker.js', import.meta.url), …)` dokumentiert; die explizit relative Form ist die, auf die sich ein Konsument verlassen kann. Die JSDoc in `OffscreenDisplay.js:77` zeigt schon diese Form. Der Preis — `bundle.js` und `rainbow-line.js` ändern sich — fällt ohnehin an, weil Schritt 2 den Worker ändert.
- **Regressionstest für den Worker-Pfad statisch, nicht über einen Bundler.** Der Fehler ist »die referenzierte Datei ist nicht im Paket«; genau das prüft die erweiterte Referenzprüfung in `npm-packages.spec.js`. Ein Vite-Build eines Konsumentenprojekts im e2e wäre neue Maschinerie für eine Aussage, die die statische Prüfung schon trägt.
- **`parseMessageData` in beiden Schichten mit derselben Regel.** Die Ursache ist dieselbe: Nachrichtendaten gehen ohne Objektprüfung in den `in`-Operator. `OffscreenWorkerDisplay#parseMessageData` fängt nur Falsy-Werte ab und wirft bei `42`, `'text'`, `true` an `'isConnected' in data` (`OffscreenWorkerDisplay.js:196`); rainbow-line wirft zusätzlich bei `null`/`undefined` an `:97`. Beide ignorieren künftig Daten, die kein Objekt sind. Nur rainbow-line zu reparieren ließe `parseMessageData(42)` weiter in der Basis werfen, die rainbow-line zuerst aufruft. Die deklarierten Parametertypen der Basis bleiben (`OffscreenDisplayMessage | null | undefined`), die Prüfung ist reine Laufzeit-Robustheit; rainbow-line erweitert seinen JSDoc-Typ auf `Record<string, any> | null | undefined` (Verbreiterung, für Konsumenten kompatibel).
- **Test-Server: `resolveFile` in ein eigenes Modul.** Der Präfix-Fehler braucht zum Nachweis ein Nachbarverzeichnis mit gleichem Namensanfang; keines der echten Routenziele hat eines. Statt eines Verzeichnisses im Repo-Baum während des Tests bekommt `resolveFile` die Routen als Parameter und wird in `e2e/resolveFile.mjs` ausgelagert, der Test baut sich sein Verzeichnispaar in `os.tmpdir()`. `server.mjs` startet beim Import einen Server und ist deshalb nicht selbst importierbar.
- **Changelogs.** rainbow-line 0.5.0: zwei `### Fixed`-Einträge, der README-Eintrag wird ergänzt. offscreen-display 0.3.0: ein `### Fixed`-Eintrag für `parseMessageData`. **Kein** Eintrag für den Kommentar-Tippfehler (keine Verhaltens- oder API-Änderung, Keep-a-Changelog führt »notable changes«) und keiner für die README-Formulierung (fällt unter den bestehenden 0.3.0-Eintrag »the README documents …«). astro-rainbow-line 1.4.0: kein Eintrag — das vendored Bundle bleibt `0.5.0`, der bestehende Eintrag »update the `rainbow-line` web component to `0.5.0`« deckt es.
- **`CLAUDE.md:68`: die Doku an den Code, nicht umgekehrt.** Ein Lizenzbanner für offscreen-display wäre eine Build-Änderung einer Bibliothek, um einen Doku-Satz wahr zu machen. Der Satz wird präzisiert.

## Vorgehen

### Schritt 1 — Worker des veröffentlichten Quell-Subpfads (rainbow-line)

**1a. Regressionstest zuerst** — `e2e/tests/npm-packages.spec.js:93`, Test `the published source modules of rainbow-line only import published files`:

- Umbenennen in `the published source modules of rainbow-line only reference published files`.
- Statt nur der direkten `from '…'`-Imports der `./src/`-Export-Ziele läuft er **transitiv** über alles, was diese Module referenzieren. Drei Formen werden gesammelt, jeweils Gruppe 1 als Specifier:
  - `/\bfrom\s+'(\.{1,2}\/[^']+)'/g` (bestehend)
  - `/\bimport\s+'(\.{1,2}\/[^']+)'/g` (Side-Effect-Import)
  - `/\bnew URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g` (jede Form, mit oder ohne `./`)
- Jeder Specifier wird mit `new URL(specifier, <URL der referenzierenden Datei>)` aufgelöst; `expect(existsSync(target), \`${specifier} referenced by ${<Pfad relativ zu .npm-pkg>} exists\`).toBe(true)`. Existierende Ziele, die auf `.js` enden, kommen in die Warteschlange; ein `Set` der besuchten `href`s verhindert Doppel und Schleifen.
- `expect(sources.length).toBeGreaterThan(0)` bleibt.
- Rot sehen: `pnpm nx buildNpmPkg rainbow-line && pnpm --dir e2e exec playwright test tests/npm-packages.spec.js --project chromium -g "reference published files"` — erwartet: `rainbow-line.worker.js referenced by src/RainbowLineElement.js exists` schlägt fehl. Ausgabe in den Report.

**1b. Fix:**

- `packages/rainbow-line/scripts/buildPackage.mjs:56-67` — in `COPY_FILES` nach `'src/attributes.js'` die Zeile `'src/rainbow-line.worker.js',` einfügen.
- `packages/rainbow-line/src/RainbowLineElement.js:66` — `new URL('rainbow-line.worker.js', import.meta.url)` → `new URL('./rainbow-line.worker.js', import.meta.url)`.
- Den Test aus 1a grün sehen (derselbe Aufruf).

**1c. Doku:**

- `packages/rainbow-line/README.md` — nach Zeile 29 (Absatz zu `rainbow-line/rainbow-line.js`), vor `## Attributes`, einen Unterabschnitt einfügen:

  ````markdown
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

  Its `createWorker()` starts the worker source `src/rainbow-line.worker.js` of the package with `new Worker(new URL('./rainbow-line.worker.js', import.meta.url), {type: 'module'})`, the pattern bundlers such as Vite and webpack recognise and bundle as a worker. A worker of your own overrides `createWorker()` and hands every message it receives to `parseMessageData()` from `rainbow-line/RainbowLineWorkerDisplay.js`, as `src/rainbow-line.worker.js` does.
  ````

- `packages/rainbow-line/CHANGELOG.md`, Abschnitt `## [0.5.0] - 2026-09-22`:
  - `### Changed`: den Eintrag `- the README shows how to use the package from npm` ersetzen durch `- the README shows how to use the package from npm, including the source modules for bundlers`
  - `### Fixed`, am Ende anhängen: `- \`RainbowLineElement\` from the source subpath \`./RainbowLineElement.js\` loaded its worker from a \`src/rainbow-line.worker.js\` that was missing from the package`
- `CLAUDE.md` — im rainbow-line-Punkt unter »Architecture« nach dem Satz, der mit »Takes `@spearwolf/offscreen-display` (`workspace:*`) and `@spearwolf/eventize` as devDependencies …« beginnt und mit »… import them.« endet, anfügen: `The source subpath \`./RainbowLineElement.js\` starts its worker from \`src/rainbow-line.worker.js\`, which \`scripts/buildPackage.mjs\` publishes for that purpose.`
- `CLAUDE.md` — im e2e-Punkt unter »Tests« den Satz über `npm-packages.spec.js` ergänzen: nach »checks the publishable `package.json` files and that every `exports` target exists« einfügen `and that the published source modules of rainbow-line reference only published files (imports and \`new URL(…, import.meta.url)\`, followed transitively)`.

### Schritt 2 — `parseMessageData` ignoriert Nachrichten, die kein Objekt sind (offscreen-display und rainbow-line)

**2a. Regressionstests zuerst:**

- `packages/offscreen-display/test/offscreen-display.test.js` — ans Dateiende ein neuer Block. Import oben ergänzen: `import {OffscreenWorkerDisplay} from '../dist/offscreen-display-worker.js';` (dieselbe Build-Ausgabe, die die Fixture importiert; der Konstruktor braucht keinen Worker-Kontext).

  ```js
  describe('OffscreenWorkerDisplay', () => {
    test('parseMessageData() ignores message data that is not an object', () => {
      const display = new OffscreenWorkerDisplay();
      try {
        for (const data of [null, undefined, 0, 42, '', 'resize', true]) {
          expect(() => display.parseMessageData(data)).not.toThrow();
        }
      } finally {
        display.destroy();
      }
    });
  });
  ```

  Rot sehen mit `pnpm nx test offscreen-display` (erwartet: TypeError `Cannot use 'in' operator …` bei `42`).

- `packages/rainbow-line/test/rainbowLineBehaviour.js` — in `describeRainbowLine` vor `terminates its worker once it has been removed` ein neuer Test (läuft damit für beide Builds):

  ```js
  test('ignores worker messages that are not objects', async () => {
    const line = mountRainbowLine();
    await readDrawnRow(line);

    const errors = [];
    line.worker.addEventListener('error', (event) => {
      // otherwise the browser reports it as an unhandled error of the page and vitest aborts the run
      event.preventDefault();
      errors.push(event.message);
    });
    for (const data of [null, undefined, 42, 'cycle-colors']) {
      line.worker.postMessage(data);
    }

    // the worker handles its messages in order: once the new colors show, it has seen the ones before
    line.setAttribute('cycle-colors', 'red blue');
    await expectRedAndBlueOnly(line);
    expect(errors).toEqual([]);
  });
  ```

  `expectRedAndBlueOnly` gibt es schon in der Datei (`:61`). Rot sehen mit `pnpm nx test rainbow-line` (erwartet: `errors` enthält TypeErrors wie `Cannot use 'in' operator …`, in beiden Varianten — `null`/`undefined` scheitern in rainbow-line, `42`/`'cycle-colors'` schon in der Basis). Die Fehler-Events stehen als Tasks im Main Thread an, lange bevor ein Screenshot die neuen Farben zeigt; bleibt der rote Lauf trotzdem grün, beweist der Test nichts und gehört umgebaut, nicht übernommen.

**2b. Fix:**

- `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:189` — `if (!data || this.#destroyed) return;` → `if (typeof data !== 'object' || data === null || this.#destroyed) return;`. JSDoc-Typ `@param {OffscreenDisplayMessage | null | undefined} data` bleibt.
- `packages/rainbow-line/src/RainbowLineWorkerDisplay.js:91-97`:
  - JSDoc `@param {Record<string, any>} data` → `@param {Record<string, any> | null | undefined} data`
  - direkt nach `display.parseMessageData(data);` die Zeile `if (typeof data !== 'object' || data === null) return;` — die Basis sieht weiterhin jede Nachricht zuerst.
- Beide Tests grün sehen.

**2c. Changelogs:**

- `packages/offscreen-display/CHANGELOG.md`, `## [0.3.0] - 2026-09-22` → `### Fixed`, am Ende anhängen: `- \`OffscreenWorkerDisplay#parseMessageData()\` threw on message data that is not an object, such as a number or a string; it ignores such data like \`null\``
- `packages/rainbow-line/CHANGELOG.md`, `## [0.5.0] - 2026-09-22` → `### Fixed`, am Ende anhängen: `- \`parseMessageData()\` from \`./RainbowLineWorkerDisplay.js\` threw on \`null\`, \`undefined\` and other message data that is not an object; it ignores such data`

### Schritt 3 — vendored Bundle neu kopieren

Nach Schritt 1 und 2, mit gebautem rainbow-line (`pnpm nx build rainbow-line`):

```sh
cp packages/rainbow-line/bundle.js packages/astro-rainbow-line/rainbow-line-v0.5.0.js
```

Keine weitere Änderung in `packages/astro-rainbow-line/` (Version, Default-Pfad und README stehen schon auf 0.5.0). Das `cmp` im Verify-Kommando prüft den Gleichstand.

### Schritt 4 — e2e-Test-Server: Pfadprüfung und kaputte Escapes

**4a. Refactoring ohne Verhaltensänderung** — neue Datei `e2e/resolveFile.mjs`, die `resolveFile` aus `e2e/server.mjs:29-46` mit der Routentabelle als erstem Parameter übernimmt, zunächst mit der **bestehenden** Prüfung `if (!file.startsWith(dir)) return undefined;`:

```js
/**
 * Maps a decoded url path to a file in the directory of the first route whose prefix it starts with.
 * A directory resolves to its index.html; anything that does not exist is undefined.
 *
 * @param {Record<string, string>} routes url path prefix → directory
 * @param {string} urlPath
 * @returns {string | undefined}
 */
export function resolveFile(routes, urlPath) { … }
```

`e2e/server.mjs` importiert sie (`import {resolveFile} from './resolveFile.mjs';`) und ruft `resolveFile(ROUTES, …)`; die nicht mehr gebrauchten Imports (`statSync`, `normalize`) dort entfernen.

**4b. Regressionstests zuerst** — neue Datei `e2e/tests/server.spec.js`:

```js
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect, test} from '@playwright/test';
import {resolveFile} from '../resolveFile.mjs';

test('resolveFile() stays inside the directory of a route, also next to a neighbour with the same name prefix', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'e2e-resolve-file-'));
  try {
    mkdirSync(join(tmp, 'root'));
    writeFileSync(join(tmp, 'root', 'page.html'), '');
    mkdirSync(join(tmp, 'root-neighbour'));
    writeFileSync(join(tmp, 'root-neighbour', 'secret.txt'), '');
    const routes = {'/r/': join(tmp, 'root')};

    expect(resolveFile(routes, '/r/page.html')).toBe(join(tmp, 'root', 'page.html'));
    expect(resolveFile(routes, '/r/../root-neighbour/secret.txt')).toBeUndefined();
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
});

test('the server answers a malformed escape with 400 and keeps running', async ({request}) => {
  expect((await request.get('/pages/%E0%A4%A')).status()).toBe(400);
  expect((await request.get('/pages/bundle.html')).ok()).toBe(true);
});
```

Der Pfad `/r/../root-neighbour/…` ist das, was beim Server nach `decodeURIComponent` aus `/r/..%2Froot-neighbour/…` wird (`%2F` normalisiert der URL-Parser nicht weg).

`e2e/playwright.config.js:23-25` — beide Specs brauchen keinen Browser: `testIgnore` von `firefox` und `webkit` auf `['npm-packages.spec.js', 'server.spec.js']`, der Kommentar in `:23` wird zu `// npm-packages.spec.js and server.spec.js need no browser, running them once is enough`.

Rot sehen, **nur diese Datei** (der zweite Test beendet den Server im roten Zustand, danach scheitert jeder weitere Test am Verbindungsaufbau): `pnpm --dir e2e exec playwright test tests/server.spec.js --project chromium`. Erwartet: Test 1 bekommt den Pfad in `root-neighbour` statt `undefined`, Test 2 scheitert mit einem Verbindungsfehler (`socket hang up`/`ECONNRESET`). Einen danach noch laufenden oder toten Server auf Port 4180 vor dem nächsten Lauf beenden (`reuseExistingServer` ist lokal an).

**4c. Fix:**

- `e2e/resolveFile.mjs` — das Verzeichnis einmal mit `resolve(dir)` normalisieren (entfernt einen abschließenden Trenner, den `join` stehen ließe), den Pfad mit `join(root, urlPath.slice(prefix.length))` bilden und prüfen: `if (file !== root && !file.startsWith(root + sep)) return undefined;` (`sep`, `resolve`, `join` aus `node:path`). Ein Kommentar dazu, warum der Trenner dazugehört: ein Nachbarverzeichnis mit demselben Namensanfang (`root-neighbour` neben `root`) läge sonst drin.
- `e2e/server.mjs:48-49` — das Dekodieren in `try`/`catch`:

  ```js
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    // a malformed escape such as %E0%A4%A throws a URIError, which would end the whole server
    res.writeHead(400).end('bad request');
    return;
  }
  const file = resolveFile(ROUTES, urlPath);
  ```

- Beide Tests grün sehen (derselbe Aufruf).
- `CLAUDE.md`, e2e-Punkt unter »Tests«: nach dem Satz über `e2e/server.mjs` (»Playwright against `e2e/server.mjs`, a plain static server without transforms.«) anfügen: `\`server.spec.js\` checks that it keeps every path inside the directory of its route (\`e2e/resolveFile.mjs\`) and answers a malformed escape with 400.`

### Schritt 5 — Doku-Reste

- `packages/offscreen-display/src/lib/main/OffscreenDisplay.js:229` — `// TODO adpoptedCallback ?` → `// TODO adoptedCallback ?` (nur die Schreibweise; das TODO bleibt).
- `packages/offscreen-display/README.md:5` — den Satz ersetzen durch:
  `A minimal javascript library that makes it pretty easy for you to create a _custom element_ that hands its canvas over to a _web worker_ as an [\`OffscreenCanvas\`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) and renders it in the _animation frame_ loop of the browser.`
- `CLAUDE.md:32` — den Satz `Test files are not type checked, since they import build output.` ersetzen durch `The package tests in \`packages/*/test/\` are not type checked, since they import build output; the Playwright specs in \`e2e/tests/\` and the scripts directly in \`e2e/\` are.`
- `CLAUDE.md:68` — den Absatz ersetzen durch: `The esbuild outputs of \`rainbow-line\` (\`bundle.js\`, \`rainbow-line.js\`, \`rainbow-line.worker.js\`) get a license banner from \`scripts/makeBanner.mjs\` containing the package version plus a build tag and date; the build of \`offscreen-display\` sets none.`

### Schritt 6 — Verify

`E2E_SKIP_WEBKIT=1 pnpm verify && cmp packages/rainbow-line/bundle.js packages/astro-rainbow-line/rainbow-line-v0.5.0.js` — alles grün, `cmp` ohne Ausgabe. Vorher prüfen, dass kein Server aus Schritt 4b mehr auf Port 4180 hängt.

## Was nicht dazugehört

- Kein `adoptedCallback` implementieren — der Queue-Eintrag ist der Tippfehler.
- Kein Lizenzbanner für offscreen-display (siehe Entscheidungen).
- Keine weiteren Guards in der Test-Fixture `test-display.worker.js` (`data.fillStyle` auf `null` würde dort werfen; die Fixture bekommt nur Objekte, der neue Basistest ruft `parseMessageData` direkt).
- Keine Versions-Bumps: offscreen-display 0.3.0, rainbow-line 0.5.0 und astro-rainbow-line 1.4.0 sind unveröffentlicht (`main` 5 Commits vor `origin/main`).

## Befunde im Volltext

**Queue · low · `packages/offscreen-display/src/lib/main/OffscreenDisplay.js:229` (Queue: `:214`)** — Tippfehler im Kommentar `// TODO adpoptedCallback ?` (gemeint: `adoptedCallback`). Aus Paket 2, vorbestehend (`e57a13c`). Der Kommentar steht wegen `minify: false` auch in `dist/offscreen-display.js:197`.

**Queue · medium · `packages/rainbow-line/src/RainbowLineElement.js:66`** (`createWorker()`, `new URL('rainbow-line.worker.js', import.meta.url)`) — der veröffentlichte Quell-Subpfad `./RainbowLineElement.js` lädt seinen Worker aus `.npm-pkg/src/rainbow-line.worker.js`, das nicht veröffentlicht wird (404, wenn ein Konsument `createWorker()` nicht überschreibt); vorbestehend seit `e57a13c`, die Import-Prüfung in `e2e/tests/npm-packages.spec.js` sieht `new URL(…)` und Side-Effect-Imports nicht. Aus Paket 3. Hinweis aus Zug 0 von Paket 4: der Fix ändert auch `bundle.js` (es enthält den Basis-`createWorker()`), danach `packages/astro-rainbow-line/rainbow-line-v0.5.0.js` neu aus `bundle.js` kopieren; die Quell-Subpfade dokumentiert Paket 4 im rainbow-line-README bewusst nicht, das gehört zu diesem Fix.

**Queue · low · `CLAUDE.md:68`** — »esbuild outputs get a license banner from `scripts/makeBanner.mjs`« stimmt nur für rainbow-line; `packages/offscreen-display/scripts/build.mjs` setzt kein Banner. Aus Paket 4.

**Queue · low · `CLAUDE.md:32`** — »Test files are not type checked« gilt nur für `packages/*/test/`; `tsconfig.json` nimmt `e2e/tests/**/*.js` (dazu `e2e/*.js`, `e2e/*.mjs`) mit auf. Aus Paket 4.

**Queue · low · `packages/offscreen-display/README.md:5`** — »creates an _offline canvas_«, gemeint ist `OffscreenCanvas`. Aus Paket 4.

**Queue · low · `packages/rainbow-line/src/RainbowLineWorkerDisplay.js:97`** (`parseMessageData`) — `'color-slice-width' in data` wirft bei `null`/`undefined` einen TypeError, obwohl `display.parseMessageData(data)` davor `null` abfängt; die Elemente senden immer Objekte. Aus Paket 4. Hinweis: bei rainbow-line-Code vendored Bundle neu kopieren und Changelog in 0.5.0, solange nicht gepusht.

**Zug 0 · low · `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:196`** (`parseMessageData`) — `if (!data …) return;` lässt truthy Primitive durch, `'isConnected' in data` wirft dann bei `42`, `'text'` oder `true` einen TypeError. Vorbestehend (`git show e57a13c:…/OffscreenWorkerDisplay.js`, `:102` und `:109`). Gleiche Ursache wie der vorige Eintrag, deshalb in dieses Paket genommen.

**Queue · low · `e2e/server.mjs:36` und `:49`** — `file.startsWith(dir)` prüft ohne Pfadtrenner (Nachbarverzeichnis mit gleichem Präfix erreichbar), `decodeURIComponent` wirft bei kaputtem Escape und beendet den Test-Server. Aus Paket 4, vorbestehend (`e57a13c`, `:32` und `:45`).

## Urteil des Reviewers (Zug 3, `paket-6.review-1.json`)

Gesamturteil: freigeben. Keine Qualitätsbefunde, auch keine kleinen.

- `adpoptedCallback` — behoben: `packages/offscreen-display/src/lib/main/OffscreenDisplay.js:229` liest `// TODO adoptedCallback ?`
- Worker des Quell-Subpfads — behoben: `packages/rainbow-line/scripts/buildPackage.mjs` nimmt `src/rainbow-line.worker.js` in `COPY_FILES`, `packages/rainbow-line/src/RainbowLineElement.js` nutzt `./rainbow-line.worker.js`; transitive Referenzprüfung `e2e/tests/npm-packages.spec.js:93` grün, `cmp` des vendored Bundles ohne Ausgabe
- `CLAUDE.md:68` Banner — behoben, unterscheidet rainbow-line und offscreen-display
- `CLAUDE.md:32` Typecheck der Tests — behoben, unterscheidet `packages/*/test/` von `e2e/tests/` und `e2e/*`
- `packages/offscreen-display/README.md:5` — behoben, `OffscreenCanvas` mit MDN-Link
- `RainbowLineWorkerDisplay.js` `parseMessageData` bei `null`/`undefined` — behoben durch den Objekt-Guard nach dem Basisaufruf; Test `ignores worker messages that are not objects` in `packages/rainbow-line/test/rainbowLineBehaviour.js` grün in beiden Builds
- `OffscreenWorkerDisplay.js:189` truthy Primitive — behoben durch `typeof data !== 'object' || data === null`; Test in `packages/offscreen-display/test/offscreen-display.test.js` grün
- `e2e/server.mjs` Präfixprüfung und `decodeURIComponent` — behoben: `e2e/resolveFile.mjs` prüft gegen `root + sep`, `server.mjs` fängt den `URIError` und antwortet 400; beide Tests in `e2e/tests/server.spec.js` grün
