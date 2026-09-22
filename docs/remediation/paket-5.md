# Paket 5 — Nachtrag zu Paket 2: Changelogs, Testaussage im README, WebKit-Hinweis, Test für angehaltene Frames

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: keine aus dem Audit — Folgen aus Paket 2, dazu zwei vorbestehende Nebenbefunde mit derselben Ursache
  (siehe »Abgleich« und »Triage«)
- Folge von: Paket 2
- Ziel: Was Paket 2 halb fertig hinterlassen hat, ist zu Ende gebracht — die Changelogs folgen Keep-a-Changelog und
  den Konventionen, das README sagt richtig, wo welche Tests laufen, der Hinweis auf das ausgelassene WebKit erscheint
  einmal pro e2e-Lauf, und die Worker-Seite von `{isConnected: false}` ist getestet.
- Modell: mittlere Stufe — sechs Dateien, jeder Schritt mit exaktem Text, aber zwei Nachweise mit Urteil (Mutationsprobe
  am Test, Zählung des Hinweises vor und nach der Änderung); das liegt über reiner Transkription
- Effort: low — Texte, Code und Kommandos stehen unten vollständig
- Dateien:
  - `packages/offscreen-display/CHANGELOG.md`
  - `packages/rainbow-line/CHANGELOG.md`
  - `README.md`
  - `e2e/playwright.config.js`
  - `packages/offscreen-display/test/fixtures/test-display.worker.js`
  - `packages/offscreen-display/test/offscreen-display.test.js`
  - nur vorübergehend für die Mutationsprobe, danach wieder unverändert:
    `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`
- Vorgehen: siehe Abschnitt »Vorgehen« unten, Schritte 1–6 in dieser Reihenfolge
- Verify:
  `E2E_SKIP_WEBKIT=1 pnpm verify && test "$(E2E_SKIP_WEBKIT=1 pnpm --dir e2e exec playwright test 2>&1 | grep -c 'e2e: skipping the webkit project')" = 1`
  (erst der volle Lauf wie in allen Paketen, dann ein zweiter, ungecachter e2e-Lauf direkt über Playwright, der den
  Hinweis genau einmal zeigen muss; der zweite Teil braucht die Build-Ausgabe, die der erste erzeugt)
- Commit:

  ```
  tidy the unreleased changelogs, report the skipped webkit project once, test paused worker frames

  - offscreen-display changelog: a single changed section; rainbow-line changelog: one tight fixed list,
    the bundle.js entry names its browser targets
  - readme: the package tests run in chromium (astro-rainbow-line in node), the e2e tests in all three browsers
  - e2e config: playwright loads it in every worker process, only the main process reports the skipped webkit project
  - offscreen-display: test that the worker stops its frames on {isConnected: false} and resumes on {isConnected: true}
  ```

- Verlauf:
  - 2026-09-22 Zug 0: Detailplan steht · offscreen-display `CHANGELOG.md:16`/`:30` unverändert · rainbow-line
    `CHANGELOG.md:14` unverändert · `es2017`-Eintrag nach `CHANGELOG.md:23` gewandert, vorbestehend (`a785bdf`, vor
    der Basis `e57a13c`), keine Folge von Paket 1 → als Nebenbefund aufgenommen · `README.md:19` unverändert, dazu
    Nebenbefund `README.md:37` aufgenommen · `e2e/playwright.config.js:8` unverändert · isConnected-Test fehlt
    unverändert · »Offene Befunde«: keiner mit derselben Ursache, alle sechs bleiben in der Queue · Folgen aus Paket 3:
    keine für dieses Paket (die eine liegt bei Paket 4)
  - 2026-09-22 Zug 1: Implementierer beauftragt, sonnet (mittlere Stufe), effort low, Report `paket-5.impl-1.json`
  - 2026-09-22 Zug 2: Report FERTIG · 6 Dateien (beide CHANGELOGs, `README.md`, `e2e/playwright.config.js`, Fixture, `offscreen-display.test.js`) · Arbeitsbaum schmutzig · Mutationsprobe rot (25 statt 7), Hinweis 29 → 1 · Verify exit=0 (`paket-5.verify.log`)
  - 2026-09-22 Zug 3: Reviewer sonnet/low · alle sechs Schritte erfüllt, textgenau · keine kritischen Befunde · »wichtig«: Änderung noch nicht committet — kein Code-Befund, das ist Zug 5, keine Runde · Diff `paket-5.diff`
  - 2026-09-22 Zug 4: entfällt, nichts offen
  - 2026-09-22 Zug 5: Commit 8c34e81, Verify aus Zug 2 (keine Änderung seither)

## Reviewer-Urteil

- Changelogs (`packages/offscreen-display/CHANGELOG.md` ein `### Changed`; `packages/rainbow-line/CHANGELOG.md` Fixed-Liste ohne Leerzeile, `es2017`-Rückblick ersetzt durch Targets): behoben
- `README.md:19` und `:36`: behoben
- `e2e/playwright.config.js`: Hinweis nur im Hauptprozess (`!process.env.TEST_WORKER_INDEX`), 1× pro Lauf: behoben
- Fixture + Test `the worker stops its frames on {isConnected: false} and resumes them on {isConnected: true}`: behoben, Mutationsprobe rot (25 statt 7)
- Kleine Befunde: keine

## Abgleich

Stand: `HEAD` = `c667c20`, Arbeitsbaum sauber bis auf Plan und `docs/remediation/`.

| Fundstelle aus dem Plan | Jetzt | Urteil |
| --- | --- | --- |
| `packages/offscreen-display/CHANGELOG.md:16` und `:30` — zwei `### Changed` unter `[Unreleased]` | unverändert: `:16` `### Changed` (fünf Einträge aus Paket 2, Blame `7b2b0ce`), `:24` `### Fixed`, `:30` `### Changed` mit dem Provenance-Eintrag `:32` (Blame `cdafb38`, Paket 1). Entstanden, weil Paket 2 einen zweiten Abschnitt vor `### Fixed` angelegt hat, statt in den vorhandenen zu schreiben | Folge von Paket 2, bleibt |
| `packages/rainbow-line/CHANGELOG.md:14` — Leerzeile in der Fixed-Liste | unverändert: `:12`–`:13` aus Paket 2 (`7b2b0ce`), `:14` leer (`7b2b0ce`), ab `:15` die übrigen Einträge | Folge von Paket 2, bleibt |
| `packages/rainbow-line/CHANGELOG.md:19` — »… instead of `es2017` …« (im Plan: aus Paket 1) | verschoben nach `:23` (Paket 3 hat die Fixed-Liste um vier Zeilen verlängert). Blame: `a785bdf` — der Eintrag stand schon vor dem Lauf da, `git show e57a13c:packages/rainbow-line/CHANGELOG.md` zeigt ihn wortgleich. Die Einordnung »Folge von Paket 1« im Plan ist falsch | **vorbestehend** → Nebenbefund, aufgenommen (siehe »Triage«) |
| `README.md:19` — »The tests run in headless chromium, firefox and webkit« | unverändert an `:19` (Blame `7b2b0ce`). Die Paket-Tests von `offscreen-display` und `rainbow-line` laufen laut `vitest.shared.mjs` nur in Chromium, `astro-rainbow-line` laut `packages/astro-rainbow-line/vitest.config.mjs` in Node | Folge von Paket 2, bleibt |
| `e2e/playwright.config.js:8` — `console.warn` je Worker-Prozess | unverändert an `:8`. Ursache belegt in Playwright 1.63.0 (`node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/lib/worker/workerProcessEntry.js`): jeder Worker setzt `process.env.TEST_WORKER_INDEX` im Konstruktor (`:1376`) und lädt die Config erst danach in `_loadIfNeeded()` (`:1481`, `deserializeConfig`). Der Hauptprozess lädt sie bei `playwright test` einmal (`runner/index.js:6947`/`:6952`, In-Process-Loader). `--list` zeigt den Hinweis schon heute einmal, weil dort keine Worker starten | Folge von Paket 2, bleibt |
| `packages/offscreen-display/test/offscreen-display.test.js` — kein Test für angehaltene Frames nach `{isConnected: false}` | unverändert: der Test `stops rendering frames while disconnected and resumes on reconnect` (`e57a13c`, `:140`) ist ersetzt, kein Nachfolger. Worker-Seite in `OffscreenWorkerDisplay.js:148`–`:157`: `{isConnected: false}` setzt das Signal und bricht den rAF ab, `{isConnected: true}` fordert ihn neu an; `#onFrame` (`:109`) prüft zusätzlich `ready` | Folge von Paket 2, bleibt |

## Triage

**Folgen aus erledigten Paketen.** Paket 2: sechs Folgen hierher, eine nach Paket 4 (vendored Bundle, steht dort).
Paket 3: eine Folge (`RainbowLine.astro:31-32`, `@ts-ignore`), steht bei Paket 4. Paket 1: keine. Nichts neu zu
verteilen.

**Umgeordnet:** der `es2017`-Eintrag ist keine Folge, sondern vorbestehend (`a785bdf`). Er bleibt trotzdem in diesem
Paket: Paket 4 datiert genau diesen `[Unreleased]`-Abschnitt als Release 0.5.0 und hängt laut Plan von Paket 5 ab,
damit es aufgeräumte Changelogs datiert — nach dem Datieren wäre dieselbe Korrektur ein Eingriff in eine datierte
Release-Notiz. Die Zahl »about 10% smaller« ist zudem seit Paket 3 unbelegt (der Worker hat eine neue Zeichenroutine).
Scope-Regel: alles, also im Lauf; low.

**Nebenbefund aufgenommen, gleiche Ursache wie `README.md:19`:** `README.md:37` sagt für `pnpm test`
»([vitest](https://vitest.dev/) browser mode)« für jedes Package; `astro-rainbow-line` läuft in Node. Vorbestehend
(Blame `a785bdf`). Dieselbe Aussage — wo laufen welche Tests —, zwei Zeilen weiter: ohne diese Zeile wäre das Ziel
»das README sagt richtig, wo welche Tests laufen« nicht erreicht. low.

**»Offene Befunde« geprüft, keiner mit derselben Ursache:**

- `OffscreenDisplay.js:214` (Tippfehler) und `:81`/`:167` (JSDoc) — Quellkommentare, andere Ursache.
- `RainbowLineElement.js` `createWorker()` (Worker-Pfad im Quell-Subpfad) — Packaging, andere Ursache.
- `packages/rainbow-line/README.md:38` (mailto) — andere Datei, andere Ursache.
- `packages/rainbow-line/CHANGELOG.md` Vergleichslinks (`:71`–`:73`) — gleiche Datei, aber Release-Pflege, nicht
  Paket 2. Nicht aufgenommen: der Tag `rainbow-line-v0.4.0` existiert im Repo nicht (`git tag -l`: bis `v0.3.0`), ein
  korrekter Link hängt also am Tagging des Releases — Sache von Paket 4 und dem Nutzer. Hinweis im Plan bei Paket 4.
- `packages/astro-rainbow-line/README.md:5` (`BASE_URL`) — andere Datei, andere Ursache.

## Entscheidungen dieses Zug 0

- **Kein Changelog-Eintrag für den neuen Test und die Fixture.** Keep-a-Changelog hält fest, was sich für die Nutzer
  eines Packages ändert; `test/` wird nicht veröffentlicht (`packages/offscreen-display/scripts/buildPackage.mjs`
  kopiert nur `dist/`, `LICENSE`, `README.md`, `CHANGELOG.md`), und das Verhalten ändert sich nicht. Die Konvention
  »jede Änderung an einem Package bekommt ihren Eintrag« zielt auf ausgelieferte Änderungen. Die übrigen Änderungen
  dieses Pakets sind Changelogs selbst, das Root-README und die e2e-Config — kein Package-Verhalten.
- **Hinweis nur im Hauptprozess über `TEST_WORKER_INDEX`, kein `globalSetup`.** Die Variable ist in Playwright
  dokumentiert (»Worker index and parallel index«, `process.env.TEST_WORKER_INDEX`) und in 1.63.0 gesetzt, bevor der
  Worker die Config lädt (siehe »Abgleich«). Ein `globalSetup` bräuchte eine eigene Datei für eine Zeile Ausgabe.
  `skipWebkit` selbst bleibt unbedingt berechnet: die Worker müssen dieselbe Projektliste sehen wie der Hauptprozess.
- **Die Fixture quittiert jede `isConnected`-Nachricht, der Test wartet auf die Quittung statt auf eine feste Zeit.**
  Nachrichten eines Workers kommen in Sendereihenfolge an; alle Frames, die vor dem Verarbeiten gerendert wurden,
  sind da, bevor die Quittung ankommt. Danach ist die Stille das, was der Test prüft. Die Quittung spiegelt den
  **Wert der Nachricht**, nicht den Zustand des Displays — sonst schlüge die Mutationsprobe (Schritt 6) schon beim
  Warten auf die Quittung fehl statt an den Frames.
- **Mutationsprobe statt rotem Lauf.** Das Paket behebt keinen Fehler, der Test deckt vorhandenes Verhalten ab und
  ist sofort grün. Beweiskraft bekommt er durch die Probe in Schritt 6: das Verhalten vor `a785bdf` (Nachricht
  `{isConnected: false}` ignoriert) wiederherstellen, der neue Test muss rot werden. Das bloße Entfernen von
  `#cancelAnimationFrame()` taugt dafür nicht — `#onFrame` prüft `ready` und bliebe trotzdem stumm.
- **`bundle.js`-Eintrag nennt die Targets statt des Vergleichs.** Die Targets stehen in
  `packages/rainbow-line/scripts/build.mjs:20` (`['chrome121', 'edge120', 'safari17', 'firefox122']`), und
  `scripts/esbuildInlineWorkerPlugin.mjs:28`–`:33` reicht `build.initialOptions.target` an den Worker-Build durch.
  Das ist ein Satz, der ohne Kenntnis des Vorzustands trägt.

## Vorgehen

### 1. `packages/offscreen-display/CHANGELOG.md` — ein `### Changed`

Den zweiten Abschnitt `### Changed` (`:30`–`:32`) auflösen: seinen einen Eintrag ans Ende des ersten
`### Changed` (nach `:22`) setzen, Überschrift `:30` und ihre Leerzeile `:31` löschen. Reihenfolge nach
Keep-a-Changelog: Added, Changed, Fixed. Zwischen der Fixed-Liste und `## [0.2.0] - 2024-12-12` steht danach genau
eine Leerzeile. Der Abschnitt `[Unreleased]` lautet danach exakt:

```markdown
## [Unreleased]

### Added

- `OffscreenDisplay#dispose()` terminates the worker and stops observing the canvas
- `OffscreenWorkerDisplay#destroy()` ends the frame loop and releases all listeners, retained events, signals and effects of the display
- `OffscreenWorkerDisplay#pixelRatio`: the ratio of the canvas pixels to css pixels

### Changed

- an element removed from the document terminates its worker one animation frame later; connecting it again afterwards starts a fresh worker with a fresh canvas
- the canvas size comes from a `ResizeObserver`; the main thread runs no animation frame loop of its own
- **breaking** for subclasses that assume css pixels: `{resize}` and with it `canvasWidth`/`canvasHeight` are physical pixels
- `onResize` also fires when only the `pixelRatio` changes
- `onFrame` starts with the first size from the main thread
- published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); `package.json` names the source `repository`

### Fixed

- the worker kept running after its element was removed from the document
- an `onFrame` listener that threw ended the animation
- `OffscreenWorkerDisplay` ignored the `{isConnected: false}` message, so the worker kept rendering frames after the element was disconnected

## [0.2.0] - 2024-12-12
```

Sonst nichts in der Datei ändern (die doppelte Leerzeile vor `## [0.1.2]` bleibt, sie ist gültiges Markdown und
nicht Teil dieses Pakets).

### 2. `packages/rainbow-line/CHANGELOG.md` — eine Fixed-Liste, `bundle.js`-Eintrag

- Die Leerzeile `:14` zwischen `- a removed element terminates its worker` und
  ``- the `./rainbow-line.worker.js` subpath export …`` löschen. Die Fixed-Liste ist danach eine zusammenhängende
  Liste aus sieben Einträgen.
- Den Eintrag `:23` ersetzen. Heute:

  ```markdown
  - `bundle.js`: the inlined worker is built for the same browser targets as the element instead of `es2017`, which makes the bundle about 10% smaller
  ```

  Danach exakt:

  ```markdown
  - `bundle.js`: the inlined worker is built for the same browser targets as the element (`chrome121`, `edge120`, `safari17`, `firefox122`)
  ```

Sonst nichts ändern, insbesondere nicht die Vergleichslinks am Dateiende (liegen in der Queue, Paket 4).

### 3. `README.md` — wo welche Tests laufen

- Zeile `:19`, heute:

  ```markdown
  ... to install or refresh all the dependencies. The tests run in headless chromium, firefox and webkit, which have to be installed once with ..
  ```

  Danach exakt:

  ```markdown
  ... to install or refresh all the dependencies. The e2e tests run in headless chromium, firefox and webkit, the package tests in headless chromium (`astro-rainbow-line` in node); all three browsers have to be installed once with ..
  ```

- Zeile `:37`, heute:

  ```markdown
  | `pnpm test` | blackbox tests of every package against its build output ([vitest](https://vitest.dev/) browser mode) |
  ```

  Danach exakt:

  ```markdown
  | `pnpm test` | blackbox tests of every package against its build output ([vitest](https://vitest.dev/): browser mode in chromium, node for `astro-rainbow-line`) |
  ```

`README.md:25` (WebKit-Bibliotheken, `E2E_SKIP_WEBKIT=1`) stimmt und bleibt.

### 4. `e2e/playwright.config.js` — Hinweis einmal pro Lauf

**Vorher messen** (Beleg für den Report, bevor die Datei angefasst wird; die Build-Ausgabe muss dafür stehen, deshalb
zuerst der e2e-Lauf über nx):

```bash
E2E_SKIP_WEBKIT=1 pnpm nx e2e e2e > "$ARBEITSDIR/paket-5.e2e-vorher.log" 2>&1; echo "exit=$?"
E2E_SKIP_WEBKIT=1 pnpm --dir e2e exec playwright test 2>&1 | grep -c 'e2e: skipping the webkit project'
```

`$ARBEITSDIR` ist `/tmp/claude-1000/-home-spw-spaceland-visual-fx-web-components/09543aa0-4d6e-4d0f-8ffc-49168ab25958/scratchpad`.
Erwartet: eine Zahl größer als 1 (Paket 2 hat 13 bis 29 gezählt). Die Zahl gehört in den Report.

**Dann ändern.** Zeilen `:5`–`:8` heute:

```js
// Playwright's webkit needs system libraries that not every Linux distribution provides (ICU 74 and flite,
// missing on Arch-based systems); E2E_SKIP_WEBKIT=1 leaves it out locally, CI always runs it
const skipWebkit = !!process.env.E2E_SKIP_WEBKIT && !process.env.CI;
if (skipWebkit) console.warn('e2e: skipping the webkit project (E2E_SKIP_WEBKIT is set)');
```

Danach exakt:

```js
// Playwright's webkit needs system libraries that not every Linux distribution provides (ICU 74 and flite,
// missing on Arch-based systems); E2E_SKIP_WEBKIT=1 leaves it out locally, CI always runs it
const skipWebkit = !!process.env.E2E_SKIP_WEBKIT && !process.env.CI;
// every worker process loads this config again and has TEST_WORKER_INDEX set, so only the main process reports the skip
if (skipWebkit && !process.env.TEST_WORKER_INDEX) console.warn('e2e: skipping the webkit project (E2E_SKIP_WEBKIT is set)');
```

`skipWebkit` bleibt ohne die Worker-Bedingung: `projects` muss in jedem Prozess gleich aussehen. Formatiert Biome die
Zeile um (`pnpm format`), gilt dessen Form.

**Nachher messen:**

```bash
E2E_SKIP_WEBKIT=1 pnpm --dir e2e exec playwright test 2>&1 | grep -c 'e2e: skipping the webkit project'   # genau 1
E2E_SKIP_WEBKIT=1 pnpm --dir e2e exec playwright test --list 2>&1 | grep -c '\[webkit\]'                  # 0
CI=1 E2E_SKIP_WEBKIT=1 pnpm --dir e2e exec playwright test --list 2>&1 | grep -c 'skipping the webkit'    # 0
CI=1 E2E_SKIP_WEBKIT=1 pnpm --dir e2e exec playwright test --list 2>&1 | grep -c '\[webkit\]'             # > 0 (heute 15)
```

Alle vier Zahlen gehören in den Report. (`grep -c` endet mit Exit 1, wenn es 0 zählt — das ist hier kein Fehler.)

### 5. Fixture `packages/offscreen-display/test/fixtures/test-display.worker.js` — Quittung

Am Ende des `message`-Listeners, nach `display.parseMessageData(data);` (heute die letzte Zeile im Listener, `:59`),
einfügen:

```js
  // answers after the display has handled the message, so every frame rendered before it arrives ahead of this answer
  if ('isConnected' in data) {
    self.postMessage({event: 'isConnected', isConnected: data.isConnected});
  }
```

Die Quittung trägt den Wert der Nachricht, nicht `display.isConnected` (Begründung unter »Entscheidungen«). Die
Nachricht `{isConnected: true}`, die das Element beim Verbinden selbst schickt, wird ebenso quittiert; kein
bestehender Test vergleicht `events` als Ganzes, `eventsOf(name)` filtert nach Namen.

### 6. Test in `packages/offscreen-display/test/offscreen-display.test.js`

Im `describe('OffscreenDisplay + OffscreenWorkerDisplay', …)` direkt nach dem Test
`keeps its worker when it is moved to another place in the document` (endet heute an `:172`) einfügen:

```js
  test('the worker stops its frames on {isConnected: false} and resumes them on {isConnected: true}', async () => {
    const display = mountDisplay();
    await expect.poll(() => display.frameCount()).toBeGreaterThan(2);

    // the element stays in the document, only the worker side of the message is under test
    display.worker.postMessage({isConnected: false});

    await expect.poll(() => display.eventsOf('isConnected')).toContainEqual({event: 'isConnected', isConnected: false});
    const framesWhileDisconnected = display.frameCount();
    // the absence of frames can only be observed by waiting a fixed time
    await sleep(300);
    expect(display.frameCount()).toBe(framesWhileDisconnected);

    display.worker.postMessage({isConnected: true});

    await expect.poll(() => display.frameCount()).toBeGreaterThan(framesWhileDisconnected + 2);
    expect(display.terminatedWorkers).toEqual([]);
  });
```

Keine Aussage über `init`-Ereignisse aufnehmen (das Display sendet beim Wiederverbinden erneut `onInit`; das ist
nicht Gegenstand dieses Pakets).

**Mutationsprobe** (Beleg, dass der Test das Anhalten prüft):

1. `pnpm nx test offscreen-display --skip-nx-cache` — der neue Test ist grün.
2. In `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:148` vorübergehend
   `if ('isConnected' in data) {` durch `if (data.isConnected) {` ersetzen (das ignoriert `{isConnected: false}`).
3. `pnpm nx test offscreen-display --skip-nx-cache` — der neue Test muss rot sein, und zwar an
   `expect(display.frameCount()).toBe(framesWhileDisconnected)`, nicht an der Quittung. Name des roten Tests und die
   Fehlermeldung gehören in den Report.
4. Die Änderung zurücknehmen: `git checkout -- packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`,
   dann `git diff --quiet -- packages/offscreen-display/src && echo sauber` — muss `sauber` ausgeben.
5. `pnpm nx test offscreen-display --skip-nx-cache` — wieder grün.

### Abschluss

- `pnpm format` nur, wenn `pnpm lint` Formatierungsfehler in den geänderten Dateien meldet; danach `pnpm lint`.
- Kein Changelog-Eintrag für Test und Fixture (Begründung unter »Entscheidungen«).
- Verify-Kommando von oben, Exit-Code in den Report.
- Nach dem Commit gehört in `Schnittstellen:` im Plan: die Fixture `test-display.worker.js` quittiert jede
  `isConnected`-Nachricht mit `{event: 'isConnected', isConnected}` (Wert der Nachricht) · `e2e/playwright.config.js`
  meldet das ausgelassene WebKit nur im Hauptprozess (`!process.env.TEST_WORKER_INDEX`).

## Findings im Volltext

Keine Audit-Findings. Die Fundstellen stammen aus den `Folgen:` von Paket 2 im Plan (Reviewer von Paket 2) und aus
diesem Zug 0; im Wortlaut der Quelle:

**Folge von Paket 2 · `packages/offscreen-display/CHANGELOG.md:16` und `:30`** — zwei `### Changed` unter
`[Unreleased]` (Paket 1 und Paket 2), vor dem Datieren in Paket 4 zu einem zusammenlegen.

**Folge von Paket 2 · `packages/rainbow-line/CHANGELOG.md:14`** — Leerzeile mitten in der Fixed-Liste, macht sie zur
»loose list«.

**Vorbestehend (`a785bdf`), im Plan als Folge von Paket 1 geführt · `packages/rainbow-line/CHANGELOG.md:23` (damals
`:19`)** — Eintrag »… instead of `es2017` …« blickt auf den Vorzustand zurück (Konvention, veröffentlichte Doku).

**Folge von Paket 2 · `README.md:19` (damals `:22`)** — »The tests run in headless chromium, firefox and webkit«
stimmt nur für e2e, die Vitest-Paket-Tests laufen in Chromium.

**Vorbestehend (`a785bdf`), aufgenommen in Zug 0 · `README.md:37`** — »([vitest](https://vitest.dev/) browser mode)«
gilt nicht für `astro-rainbow-line`, dessen Tests in Node laufen (`packages/astro-rainbow-line/vitest.config.mjs`,
`environment: 'node'`).

**Folge von Paket 2 · `e2e/playwright.config.js:8` (damals `:10`)** — das `console.warn` zum ausgelassenen WebKit
erscheint je Playwright-Worker-Prozess (13- bis 29-mal pro Lauf), soll einmal erscheinen.

**Folge von Paket 2 · `packages/offscreen-display/test/offscreen-display.test.js`** — der ersetzte Test für das
Anhalten der Frames bei `{isConnected: false}` hat keinen Nachfolger; die Worker-Seite dieser Nachricht ist
ungetestet (Vorschlag des Reviewers: `display.worker.postMessage({isConnected: false})` senden, stehende Frames
prüfen).
