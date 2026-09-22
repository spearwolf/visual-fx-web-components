# Paket 3 — Nachlese: Kleinbefunde der Reviewer aus Paket 1 und 2

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: sechs Folgen aus den Paketen 1 (6bfd485) und 2 (cadbd10), keine
  Audit-IDs — im Volltext unten als F1 bis F6 (Nummern nur dieser Datei, sie
  gehören in keinen Code, keinen Kommentar und keine Commit-Message)
- Folge von: Paket 1 (6bfd485), Paket 2 (cadbd10)
- Ziel: Die Hinterlassenschaften der Pakete 1 und 2 sind behoben, sodass der
  Lauf keine eigenen Folgen ins Audit übergibt.
- Modell: mittlere Stufe
- Effort: medium
- Dateien:
  - `scripts/tagReleases.mjs` (F2, F3)
  - `e2e/tests/tag-releases.spec.js` (neu, F3)
  - `e2e/playwright.config.js` (F3: Spec nur in chromium; F6: Kommentar)
  - `CLAUDE.md` (F1, dazu die neue Spec im Abschnitt »Tests«)
  - `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js` (F4, nur Kommentar)
  - `packages/offscreen-display/test/fixtures/test-display.worker.js` (F5)
  - `packages/offscreen-display/test/offscreen-display.test.js` (F5)
- Kein CHANGELOG-Eintrag: kein veröffentlichtes Verhalten ändert sich. Die
  `onCanvas`-Beschreibung gehört zum unveröffentlichten 0.3.0-Eintrag »every
  event and every message property carries a description«
  (`packages/offscreen-display/CHANGELOG.md:14`), der danach genauso stimmt;
  `scripts/` gehört zu keinem Paket.

## Vorgehen

Vor jeder Änderung die Datei ganz lesen. Konventionen aus dem Plan-Kopf gelten
für jede Zeile: Code, Kommentare und Doku englisch, Kommentare erklären das
*Warum*, keine Finding-Nummern, kein Satz über den Vorzustand (»früher«,
»now«, »no longer«, »statt bisher«).

### 1. `scripts/tagReleases.mjs` — Wartezeit auf die Registry (F2)

1. Direkt nach `const DRY_RUN = …` (Zeile 9) zwei Konstanten einfügen, mit
   einem Kommentar, der den Grund der Werte nennt:

   ```js
   // registry.npmjs.org serves a package document with `cache-control: public, max-age=300`, and the publish job reads
   // it (`npm show <name> versions`) right before it publishes, so a CDN edge may answer without the new version for up
   // to five minutes; the delays add up to six
   const DEFAULT_RETRY_DELAYS = [10, 20, 30, 60, 60, 60, 60, 60];
   const RETRY_DELAYS = readRetryDelays();
   ```

   Reihenfolge wichtig: `DEFAULT_RETRY_DELAYS` vor dem Aufruf von
   `readRetryDelays()` deklarieren (TDZ).
2. Neue Funktion `readRetryDelays()` unten bei den anderen Funktionen, mit
   JSDoc `@returns {number[]}`:
   - liest `process.env.TAG_RELEASES_RETRY_DELAYS`; ungesetzt oder nach
     `trim()` leer → `DEFAULT_RETRY_DELAYS`.
   - sonst an `,` splitten, jeden Eintrag `trim()`en; gültig nur, wenn **jeder**
     Eintrag `/^\d+(\.\d+)?$/` erfüllt (damit fallen `''`, `-1`, `soon`,
     `10,,20` durch — `Number('')` wäre sonst stillschweigend 0).
   - ungültig → `console.error(`TAG_RELEASES_RETRY_DELAYS must be a comma-separated list of seconds, such as 10,20,30, got '${value}'`)`
     und `process.exit(1)`. Das geschieht beim Start, also vor der
     Paketschleife: kein `npm`-Aufruf, kein Tag.
   - gültig → die Einträge als `Number` (Sekunden).
   - JSDoc-Satz: die Pausen in Sekunden zwischen den Versuchen, eine frisch
     veröffentlichte Version auf npm zu finden; `TAG_RELEASES_RETRY_DELAYS`
     ersetzt sie (die Tests setzen `0,0`).
3. Nach den beiden `console.log` für `projectRoot`/`dryRun` eine dritte Zeile:
   `console.log('retryDelays:', DRY_RUN ? 'none (dry run)' : `${RETRY_DELAYS.join(', ')} s`);`
4. In `fetchGitHead()` (Zeile 100):
   `const retryDelaysMs = DRY_RUN ? [] : RETRY_DELAYS.map((seconds) => seconds * 1000);`
   — der Rest der Funktion bleibt, auch die Meldungen. Den JSDoc von
   `fetchGitHead()` so anpassen, dass er auf `RETRY_DELAYS` verweist statt eine
   Dauer zu nennen; `--dry-run` macht weiterhin genau einen Versuch.
5. Die Workflow-Datei bleibt unverändert: der Job `tag` setzt die Variable
   nicht, der Default gilt.

### 2. `e2e/tests/tag-releases.spec.js` — Test des Skripts (F3)

Neue Playwright-Spec ohne Browser, im Stil von `e2e/tests/server.spec.js` und
`e2e/tests/npm-packages.spec.js` (`import {expect, test} from '@playwright/test'`,
Node-Builtins, `mkdtempSync(join(tmpdir(), 'tag-releases-'))`, Aufräumen in
`finally` mit `rmSync(…, {recursive: true, force: true})`). Die Datei wird von
`pnpm typecheck` geprüft (`noImplicitAny`): Parameter der Helfer per JSDoc
typisieren.

Pfad zum Skript wie in `npm-packages.spec.js` über `import.meta.url`:
`fileURLToPath(new URL('../../scripts/tagReleases.mjs', import.meta.url))`.

**Isolation von der Git-Konfiguration des Rechners** — Pflicht, sonst hängt der
Test an `commit.gpgSign`/`tag.gpgSign` (mit `tag.gpgSign=true` wird selbst
`git tag <name> <commit>` zum signierten annotierten Tag) oder an fehlender
Identität. Jeder `git`-Aufruf der Spec und der Lauf des Skripts bekommen:
`GIT_CONFIG_GLOBAL: '/dev/null'`, `GIT_CONFIG_NOSYSTEM: '1'`. Die Setup-Commits
bekommen zusätzlich `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`,
`GIT_COMMITTER_NAME`, `GIT_COMMITTER_EMAIL` (feste Testwerte, z. B.
`tag-releases test` / `test@example.invalid`). Der Lauf des Skripts bekommt
**keine** Identität — der Test belegt damit nebenbei, dass der leichte Tag
keine braucht.

**Helfer `makeRepo(pkg)`** (ein Paket genügt je Test):
- `<tmp>/origin.git` per `git init --bare --quiet`
- `<tmp>/work` per `git init --quiet`, darin
  `packages/alpha/package.json` mit
  `{name: '@example/alpha', version: pkg.version, scripts: {publishNpmPkg: 'true'}}`
- zwei Commits (`git add -A`, `git commit --quiet -m first` / `-m second`, der
  zweite ändert z. B. eine Datei `CHANGES`), SHA beider per
  `git rev-parse HEAD` festhalten
- `git remote add origin <tmp>/origin.git`
- gibt `{tmp, work, origin, firstCommit, secondCommit}` zurück

**`npm`-Stub** in `<tmp>/bin`:
- `<tmp>/bin/npm`: Shell-Wrapper, `chmodSync(…, 0o755)`, Inhalt
  `#!/bin/sh\nexec '<process.execPath>' '<tmp>/npm-stub.mjs' "$@"\n` — der
  absolute Node-Pfad, weil `node` nicht sicher im `PATH` liegt.
- `<tmp>/npm-stub.mjs`: liest `<tmp>/npm-responses.json`
  (`{[spec: string]: Array<{stdout?: string, stderr?: string, status?: number}>}`),
  hängt `process.argv.slice(2).join(' ')` als Zeile an `<tmp>/npm-calls.log`,
  nimmt für `spec = argv[3]` (Aufruf ist `view <spec> gitHead`) die Antwort mit
  dem Index »Zahl der bisherigen Aufrufe mit diesem spec«, begrenzt auf die
  letzte; schreibt `stdout`/`stderr`, beendet mit `status ?? 0`. Fehlt der
  spec in der Datei (oder die Datei selbst), schreibt er
  `npm-stub: no response for <spec>` nach stderr und endet mit 1 — so fällt
  ein unerwarteter Aufruf im Test auf, statt still etwas zu liefern.
- Antwort E404 als Konstante:
  `{stderr: 'npm error code E404\nnpm error 404 No match found for version 1.0.0\n', status: 1}`
  (so antwortet npm 12 auf eine fehlende Version eines vorhandenen Pakets wie
  auf ein fehlendes Paket — gemessen, siehe Abgleich F2).

**Helfer `runTagReleases(repo, env)`**:
`spawnSync(process.execPath, [script], {cwd: repo.work, encoding: 'utf8', env: {...process.env, PATH: `${bin}:${process.env.PATH}`, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', TAG_RELEASES_RETRY_DELAYS: '0,0', ...env}})`
→ `{status, stdout, stderr}`. Dazu `npmCalls(repo)` (Zeilen aus
`npm-calls.log`, leer, wenn die Datei fehlt) und `originTags(repo)`
(`git --git-dir <origin> tag --list`, als Array).

**Tests** (Namen im Stil der bestehenden Specs, englisch, Präsens):
1. `tags a released version at the commit npm recorded, once the registry lists it`
   — Version `1.0.0`, Antworten für `@example/alpha@1.0.0`: E404, E404, dann
   `{stdout: firstCommit + '\n'}`; `TAG_RELEASES_RETRY_DELAYS: '0,0,0'`.
   Erwartet: `status` 0; `git --git-dir <origin> rev-parse refs/tags/alpha-v1.0.0`
   ergibt `firstCommit` (nicht `secondCommit` = `HEAD`); `npmCalls` hat drei
   Einträge `view @example/alpha@1.0.0 gitHead`.
2. `ends red when the registry still does not list the version after the last retry`
   — Antworten: nur E404; `TAG_RELEASES_RETRY_DELAYS: '0,0'`. Erwartet:
   `status` 1; `stderr` enthält `should already be published`; drei
   `npmCalls` (ein Versuch plus zwei Wiederholungen); `originTags` leer.
3. `skips a dev version without asking npm` — Version `1.1.0-dev`, keine
   Antworten. Erwartet: `status` 0; `stdout` enthält
   `is a dev version, nothing to tag`; `npmCalls` leer; `originTags` leer.
4. Eine Schleife über drei Fälle, je ein `test(…)` mit dem Fall im Namen, z. B.
   `` `ends red and names the tag to set by hand when the recorded gitHead is ${label}` ``
   — Version `1.0.0`, eine Antwort `{stdout: gitHead + '\n'}`:
   - `missing`: `gitHead` `''` → `stderr` enthält
     `npm records no gitHead for it; set the tag alpha-v1.0.0 by hand`
   - `not a commit id`: `gitHead` `'not-a-commit'` → `stderr` enthält
     `its recorded gitHead 'not-a-commit' is not a commit id; set the tag alpha-v1.0.0 by hand`
   - `not in the checkout`: `gitHead` `'0123456789abcdef0123456789abcdef01234567'`
     → `stderr` enthält `is not in this checkout; set the tag alpha-v1.0.0 by hand`

   Je erwartet: `status` 1, `originTags` leer, und lokal kein Tag
   (`git -C <work> tag --list` leer).
5. Eine Schleife über `['soon', '10,,20']`:
   `` `refuses a TAG_RELEASES_RETRY_DELAYS of '${value}'` `` — Version
   `1.0.0`, keine Antworten im Stub. Erwartet:
   `status` 1; `stderr` enthält `TAG_RELEASES_RETRY_DELAYS must be a comma-separated list of seconds`;
   `npmCalls` leer.

In `e2e/playwright.config.js` die Spec nur im Projekt chromium laufen lassen:
eine Konstante über der `defineConfig`, etwa
`const nodeOnlySpecs = ['npm-packages.spec.js', 'server.spec.js', 'tag-releases.spec.js'];`
mit dem Kommentar aus Zeile 26 (»need no browser, running them once is
enough«) an dieser Konstante, und `testIgnore: nodeOnlySpecs` in firefox und
webkit.

**Beleg, dass die Tests unterscheiden** (nicht committen): zwei Mutationsläufe
mit `pnpm --dir e2e exec playwright test --project=chromium tag-releases.spec.js`,
Ausgabe in den Report:
(a) in `fetchGitHead()` die Wiederholung abschalten (`retryDelaysMs = []`) →
Test 1 rot; (b) in `readRetryDelays()` die Prüfung entfernen → Test 5 rot.
Danach zurücknehmen; `git diff scripts/tagReleases.mjs` zeigt nur die
geplante Änderung.

### 3. `CLAUDE.md` — Absatz zum Job `tag` (F1) und die Spec

Den Absatz ab »After a successful publish job, the job `tag` runs …«
(Zeile 67) umschreiben. Die ersten beiden Sätze (was getaggt wird, einziger
Job mit `contents: write`) bleiben. Danach muss er sagen, ohne sich als
abschließend auszugeben, wo er es nicht ist:
- eine Version, die die Registry noch nicht listet, wird sechs Minuten lang
  wiederholt, weil das CDN der Registry ein Paketdokument bis zu fünf Minuten
  ohne sie ausliefern kann; `TAG_RELEASES_RETRY_DELAYS` (Sekunden,
  kommagetrennt) ersetzt die Pausen;
- der Job endet rot, sobald eine Version ungetaggt bleibt, und zählt die
  Gründe **vollständig** auf: die Registry listet sie auch dann nicht, `npm
  view` scheitert anders, npm führt keinen brauchbaren `gitHead` (keiner, keine
  Commit-ID, Commit fehlt im Checkout — die Meldung nennt dann den Tag, der von
  Hand zu setzen ist), `git tag` oder der Push scheitert, und eine ungültige
  `TAG_RELEASES_RETRY_DELAYS`;
- nach einem Fehler der Registry oder des Pushes holt der nächste Lauf den Tag
  nach, solange die Version noch die in `package.json` ist (für die
  `gitHead`-Fälle gilt das nicht — deshalb nicht pauschal formulieren);
- `node scripts/tagReleases.mjs --dry-run` bleibt erwähnt.

Formulierungsvorschlag, frei anzupassen, solange die Aufzählung vollständig
bleibt:

> A version the registry does not list yet is retried for six minutes, since
> the registry's CDN may serve a package document without it for up to five
> (`TAG_RELEASES_RETRY_DELAYS`, a comma-separated list of seconds, replaces the
> delays). The job ends red whenever a version stays untagged: the registry
> still does not list it, `npm view` fails otherwise, npm records no usable
> `gitHead` (none, not a commit id, or a commit missing from the checkout; the
> message names the tag to set by hand), `git tag` or the push fails, or
> `TAG_RELEASES_RETRY_DELAYS` is not a list of seconds. After a failure of the
> registry or the push, the next run catches up on the tag, as long as it is
> still the version in `package.json`. `node scripts/tagReleases.mjs --dry-run`
> prints what it would tag.

Im Abschnitt »Tests«, Punkt **e2e** (Zeile 40), nach dem Satz zu
`server.spec.js` einen Satz ergänzen: `tag-releases.spec.js` lässt
`scripts/tagReleases.mjs` in einem Wegwerf-Repository mit einem bare `origin`
und einem `npm`-Stub im `PATH` laufen. Dazu, dass die drei Specs ohne Browser
(`npm-packages.spec.js`, `server.spec.js`, `tag-releases.spec.js`) nur in
chromium laufen — ein Halbsatz genügt.

### 4. `OffscreenWorkerDisplay.js:24-25` — `onCanvas`-Beschreibung (F4)

Nur der Kommentar. Die Beschreibung ganz in die Folgezeile, **ohne** die
sonst übliche Einrückung von drei Leerzeichen:

```js
 * @property {[display: OffscreenWorkerDisplay, contextAttributes: Record<string, unknown> | undefined]} onCanvas
 * the canvas has arrived, with the attributes for `getContext()`; retained
```

Grund der Abweichung vom Einrückstil der anderen Folgezeilen: beginnt die
Beschreibung erst in der Folgezeile, übernimmt tsc 7 deren Einrückung in die
`.d.ts` (`*   the canvas …`); ohne Einrückung steht dort
`* the canvas has arrived, with the attributes for `getContext()`; retained`
(im Scratchpad gemessen, siehe Abgleich F4). Eine Zeile mit Beschreibung
hinter `onCanvas` passt nicht in 130 Spalten (»… onCanvas the canvas has
arrived,« wären 138).

### 5. Frame-Fehler-Drosselung für Werte, die kein `Error` sind (F5)

Fixture `packages/offscreen-display/test/fixtures/test-display.worker.js`:
- `let throwValueInEveryFrame = null;` neben `throwInEveryFrame` (Zeile 14)
- in `onFrame`, direkt nach dem `throwInEveryFrame`-Block:
  ```js
  if (throwValueInEveryFrame !== null) {
    self.postMessage({event: 'failingFrame'});
    throw throwValueInEveryFrame;
  }
  ```
- im `message`-Handler nach dem `throwInEveryFrame`-Zweig:
  `if ('throwValueInEveryFrame' in data) { throwValueInEveryFrame = data.throwValueInEveryFrame; return; }`

Test in `packages/offscreen-display/test/offscreen-display.test.js`, direkt
nach `reports an error that repeats in every frame once, until a frame runs without it`
(endet Zeile 276):

```js
test('reports a thrown value that is not an Error once while the same value repeats in every frame', async () => {
  const display = mountDisplay();
  await expect.poll(() => display.frameCount()).toBeGreaterThan(2);
  const failingFrames = () => display.eventsOf('failingFrame').length;

  display.worker.postMessage({throwValueInEveryFrame: 'plain boom'});
  await expect.poll(() => display.errors).toHaveLength(1);
  const failingFramesBefore = failingFrames();
  await expect.poll(failingFrames).toBeGreaterThan(failingFramesBefore + 5);
  expect(display.errors).toHaveLength(1);
  expect(display.errors[0]).toMatch(/plain boom/);

  // another value is reported at once, even while the series goes on
  display.worker.postMessage({throwValueInEveryFrame: 'another plain boom'});
  await expect.poll(() => display.errors).toHaveLength(2);
  expect(display.errors[1]).toMatch(/another plain boom/);
});
```

Ein geworfener String ist ein Primitiv: `Object.is` vergleicht ihn über den
Wert, der Test trifft damit genau den Zweig `: error` in
`OffscreenWorkerDisplay.js:191`. `ErrorEvent.message` lautet in Chromium etwa
`Uncaught plain boom`, deshalb `toMatch` statt Gleichheit.

**Beleg, dass der Test unterscheidet** (nicht committen): in
`OffscreenWorkerDisplay.js:191` den Schlüssel für Nicht-`Error`-Werte auf
`{}` setzen (jedes Mal neu, nie gleich), `pnpm nx test offscreen-display` →
der neue Test rot, der bestehende `Error`-Test grün; Ausgabe in den Report,
zurücknehmen.

### 6. `e2e/playwright.config.js:17-18` — Kommentar zum globalen Timeout (F6)

Der Kommentar über `expect: {timeout: 15_000}` muss sagen: die Assertions
warten auf einen Zustand, der eintrifft, nur spät, solange die Maschine
ausgelastet ist — lokal, wenn nx die Vitest-Browsertests neben den
Playwright-Projekten laufen lässt, in CI auf einem kleinen Runner mit webkit
als drittem Projekt. Firefox startet Worker und nimmt Element-Screenshots
unter dieser Last am langsamsten auf, die Last trifft aber jedes Projekt;
deshalb gilt das Timeout für alle. Nicht behaupten, WebKit sei beim Timeout
beobachtet worden — das wurde es nicht. Zeilen ≤ 130 Spalten, Präsens, kein
Rückblick.

## Verify

```sh
pnpm verify && grep -Eq '^[[:space:]]*\* the canvas has arrived, with the attributes for' packages/offscreen-display/dist/types/lib/worker/OffscreenWorkerDisplay.d.ts && ! grep -Eq '^[[:space:]]*\* the$' packages/offscreen-display/dist/types/lib/worker/OffscreenWorkerDisplay.d.ts
```

`pnpm verify` baut offscreen-display, damit liegt die `.d.ts` für die beiden
`grep` frisch vor. Baseline: alles grün (Plan-Kopf).

## Commit

```
wait out the registry cache before tagging a release and test tagReleases.mjs, test the frame error throttling with thrown non-error values, tidy the tag job docs and two comments
```

## Abgleich (Zug 0, 2026-09-22, gegen cadbd10)

Alle sechs Stellen gibt es im Stand vor dem ersten Paket-Commit (`fa94d7e`)
nicht: `scripts/tagReleases.mjs` fehlt dort, `OffscreenWorkerDisplay.js` hat
weder `canvas has arrived` noch `Object.is`/`lastFrameError`,
`playwright.config.js` kein `expect:`, `CLAUDE.md` erwähnt `tagReleases` nicht.
Damit sind alle sechs Folgen dieses Laufs, keine vorbestehend.

- **F1** unverändert — `CLAUDE.md:67`: »It waits with backoff … and ends red if
  that version still does not show up or the push fails; the next run then
  catches up on the tag …«. Rote Ausgänge im Code, die der Satz auslässt:
  `tagReleases.mjs:106-107` (`npm view` scheitert ohne E404), `:43-46`
  (kein `gitHead`), `:50-53` (keine Commit-ID), `:56-59` (Commit fehlt),
  `:72-74` (`git tag` scheitert). »the next run then catches up« stimmt für
  die `gitHead`-Fälle nicht.
- **F2** unverändert — `tagReleases.mjs:100`:
  `DRY_RUN ? [] : [10_000, 20_000, 30_000, 40_000]`, also 100 s Wartezeit.
  Gemessen am 2026-09-22: `curl -sI https://registry.npmjs.org/@spearwolf%2foffscreen-display`
  antwortet `cache-control: public, max-age=300` (`cf-cache-status: HIT`);
  `publishNpmPkg.mjs:41` liest genau dieses Dokument (`npm show <name>
  versions --json`) unmittelbar vor dem Publish. 100 s decken die 300 s nicht.
  Ebenfalls gemessen (npm 12.0.2): `npm view @spearwolf/offscreen-display@0.3.0 gitHead`
  (Paket vorhanden, Version nicht) endet mit `npm error code E404` / `No match
  found for version 0.3.0`, wie ein fehlendes Paket — die E404-Erkennung in
  `:105` greift also auch für eine neue Version eines vorhandenen Pakets.
- **F3** unverändert — kein Test ruft `scripts/tagReleases.mjs` auf
  (`git grep tagReleases` außerhalb von `.md`: nur `main.yml:88`). Der
  E404-Backoff ist mit festen 100 s (künftig 360 s) ohne Einstellbarkeit nicht
  testbar; deshalb hängt F3 an F2.
- **F4** unverändert — `OffscreenWorkerDisplay.js:24` endet auf `onCanvas the`,
  `:25` beginnt mit `canvas has arrived`; die erzeugte
  `dist/types/lib/worker/OffscreenWorkerDisplay.d.ts:27-28` zeigt `* the` /
  `* canvas has arrived, …`. Probe im Scratchpad mit tsc 7: Beschreibung in
  der Folgezeile mit Einrückung → `*   the canvas …`, ohne Einrückung →
  `* the canvas has arrived, …` in einer Zeile.
- **F5** unverändert — `offscreen-display.test.js:253-276` wirft nur
  `new Error(…)` (Fixture `test-display.worker.js:35-38`); der Zweig
  `: error` in `OffscreenWorkerDisplay.js:191` läuft in keinem Test.
- **F6** unverändert — `playwright.config.js:17-18`: »Firefox starts workers
  and takes element screenshots slowly while the machine is busy (the vitest
  browser tests and both playwright projects running at once)«. »both« stimmt
  nur ohne webkit; in CI läuft webkit immer mit (`playwright.config.js:7`),
  und `pnpm verify` läuft dort sequentiell (`run-s`), die Last kommt in CI
  also von drei parallelen Browser-Projekten, nicht von Vitest daneben.

## Triage (Zug 0)

- `Folgen:` unter Paket 1 und 2: beide `—`, nichts zu verteilen.
- »Offene Befunde«: ein Eintrag, bereits `[x]` (in Paket 2 behoben). Nichts
  aufgenommen.
- Die sechs Kleinbefunde dieses Pakets sind Folgen erster Generation aus
  Paket 1 und 2; Paket 3 ist damit die zweite Generation. Eine Folge **aus
  Paket 3** wäre die dritte und geht als Rückfrage an den Nutzer (runner.md,
  »Wo du anhältst«), nicht in ein neues Paket.
- »Nicht aufgenommen, weil nicht behebbar« im Plan bleibt stehen: die Länge
  einer committeten Commit-Message ändert nur ein Umschreiben der Historie,
  die doppelten `@typedef`-Kommentare in der `.d.ts` erzeugt tsc 7 selbst
  (auch in der Scratchpad-Probe sichtbar: der JSDoc-Block steht über `export
  declare const` noch einmal).

## Entscheidungen in Zug 0

- **Test als Playwright-Spec in `e2e/tests/`**, nicht als `node --test`-Skript
  mit eigenem Eintrag in `verify`: `server.spec.js` und `npm-packages.spec.js`
  sind dort schon browserlose Node-Tests, die Spec läuft ohne neuen Eintrag in
  `pnpm verify` und in CI, `pnpm typecheck` prüft `e2e/tests/**/*.js`, und nx
  invalidiert den e2e-Cache bei jeder Änderung unter `scripts/`
  (`nx.json`, `sharedGlobals` enthält `{workspaceRoot}/scripts/**/*`).
- **Einstellbar per Umgebungsvariable `TAG_RELEASES_RETRY_DELAYS` in
  Sekunden**, nicht per CLI-Flag: ein Zeitknopf für Tests, wie `E2E_PORT`; der
  Workflow muss ihn nicht setzen. Sekunden statt Millisekunden, weil die
  Logzeile des Skripts schon Sekunden ausgibt (`retrying in … s`).
- **Default 10, 20, 30, 60, 60, 60, 60, 60 s = 360 s**: deckt die gemessenen
  300 s `max-age` mit einer Minute Reserve; eine normale Veröffentlichung wird
  im ersten Versuch getaggt, die Wartezeit fällt nur bei Verzug an.
- **Die Aufzählung der roten Ausgänge in `CLAUDE.md` wird vollständig**,
  statt den Satz als unvollständig zu kennzeichnen: es sind sechs Gründe,
  alle im Skript mit eigener Meldung, und `CLAUDE.md` beschreibt das Verhalten
  des Jobs für den, der ihn rot sieht.
- **Keine Änderung an `.github/workflows/main.yml`**: der Job `tag` hat das
  Default-Timeout von GitHub (360 min), sechs Minuten Warten passen.

## Restplan (Zug 0)

Paket 3 ist das letzte offene Paket; danach folgt der Abschluss. Kein
Finding ist weggefallen, keine Fundstelle gewandert, keine Folge neu verteilt —
Reihenfolge und Schnitt bleiben.

## Verlauf

- 2026-09-22 Zug 0: Detailplan steht · F1–F6 unverändert gegen cadbd10, alle
  sechs im Lauf entstanden (fehlen in fa94d7e) · Folgen aus Paket 1 und 2
  keine, Queue leer (einziger Eintrag `[x]`) · Messungen: Registry
  `max-age=300`, npm 12.0.2 E404 für fehlende Version, tsc-7-Probe zur
  `onCanvas`-Beschreibung
- 2026-09-22 Zug 1: Implementierer beauftragt, sonnet/medium, Report nach
  `paket-3.impl-1.json`
- 2026-09-22 Zug 2: Report FERTIG · geändert `scripts/tagReleases.mjs`,
  `e2e/playwright.config.js`, `CLAUDE.md`, `OffscreenWorkerDisplay.js`,
  `test/fixtures/test-display.worker.js`, `test/offscreen-display.test.js`,
  neu `e2e/tests/tag-releases.spec.js` · Mutationsläufe rot (2a: 2 Tests, 2b:
  2 Tests, 5: 57 statt 1 Fehler) · Arbeitsbaum schmutzig · Verify exit=0
  (`paket-3.verify.log`), dazu test+e2e ohne nx-Cache exit=0
  (`paket-3.verify-nocache.log`, 8 Tests in `tag-releases.spec.js` grün)
- 2026-09-22 Zug 3: Reviewer sonnet/medium, Urteil »freigeben«, keine Befunde ·
  Diff `paket-3.diff`, Report `paket-3.review-1.json`
- 2026-09-22 Zug 4: keine Runde nötig
- 2026-09-22 Zug 5: Commit 3482685, Verify-Beleg `paket-3.verify.log` (exit=0)

## Urteil des Reviewers (Zug 3)

- F1 behoben — `CLAUDE.md:67`, alle sechs roten Ausgänge genannt, Nachholen
  nur für Registry- und Push-Fehler
- F2 behoben — `scripts/tagReleases.mjs:14,108`, Default 360 s, einstellbar
  über `TAG_RELEASES_RETRY_DELAYS`
- F3 behoben — `e2e/tests/tag-releases.spec.js` (8 Tests: E404-Backoff,
  `-dev`-Skip, drei `gitHead`-Fehler, zwei ungültige Wartezeiten)
- F4 behoben — `OffscreenWorkerDisplay.js:24-25`, `.d.ts` zeigt die
  Beschreibung in einer Zeile
- F5 behoben — `test/fixtures/test-display.worker.js` und
  `test/offscreen-display.test.js:279-294`, geworfener String trifft den
  `Object.is`-Zweig
- F6 behoben — `e2e/playwright.config.js`, Kommentar nennt die Last für alle
  Projekte
- Kleine Befunde: keine

## Findings im Volltext

Quelle: die Kleinbefunde der Reviewer aus Paket 1 und 2, wie sie im Plan unter
Paket 3 stehen; Fundstellen im Stand cadbd10.

**F1 · klein · `CLAUDE.md:67`** (aus Paket 1) — Der Satz zu den roten
Ausgängen des Jobs `tag` liest sich abschließend, nennt aber nicht alle
(unbrauchbarer `gitHead`, anderer `npm view`-Fehler, gescheitertes `git tag`).
Empfehlung: Aufzählung vollständig machen; siehe Vorgehen 3.

**F2 · klein · `scripts/tagReleases.mjs:100`** (aus Paket 1) — Rund 100 s
Wartezeit auf die Registry können bei langsamem CDN zu kurz sein. Empfehlung:
Wartezeit so bemessen oder einstellbar machen, dass ein normaler
Registry-Verzug nicht rot endet; siehe Vorgehen 1 (beides).

**F3 · klein · `scripts/tagReleases.mjs`** (aus Paket 1) — E404-Backoff,
`-dev`-Skip und die drei Fehlermeldungen zu `gitHead` sind ungetestet.
Empfehlung: automatischer Test, etwa mit `npm`-Shim im `PATH` gegen einen
Wegwerf-Clone, im bestehenden Verify-Gate; siehe Vorgehen 2.

**F4 · klein · `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:24`**
(aus Paket 2) — Der Umbruch in der `onCanvas`-Beschreibung trennt »the« von
»canvas«, sichtbar in der erzeugten `.d.ts`. Empfehlung: Umbruch so setzen,
dass die `.d.ts` die Beschreibung in einem Stück zeigt; siehe Vorgehen 4.

**F5 · klein · `packages/offscreen-display/test/offscreen-display.test.js:253`**
(aus Paket 2) — Die Drosselung wiederholter Frame-Fehler ist nur für
`Error`-Instanzen getestet, der `Object.is`-Zweig für andere geworfene Werte
(`OffscreenWorkerDisplay.js:191`) nicht. Empfehlung: Test mit einem geworfenen
Nicht-`Error`-Wert; siehe Vorgehen 5.

**F6 · klein · `e2e/playwright.config.js:17-18`** (aus Paket 2) — Der
Kommentar begründet das globale `expect.timeout` nur mit Firefox, nicht damit,
dass WebKit in CI dieselbe Lastursache trifft. Empfehlung: Kommentar auf die
Lastursache und alle Projekte beziehen; siehe Vorgehen 6.
