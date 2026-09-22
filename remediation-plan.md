# Remediation-Plan — visual-fx-web-components

Quelle: ./audit.html vom 2026-09-22 (nachgeführt durch den Remediation-Lauf vom selben Tag) · Branch: main · erstellt: 2026-09-22
Baseline: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm build` ✓ · `pnpm test` ✓ · `pnpm e2e` ✓ in 5 von 6 Läufen (sporadischer Firefox-Timeout, siehe »Vorbestehende Fehler«) · Gate je Paket: `pnpm verify`
Arbeitsverzeichnis: /tmp/claude-1000/-home-spw-spaceland-visual-fx-web-components/ffbbf9b0-069c-482f-bc17-882a0bf45c29/scratchpad (Diffs und Verify-Logs, außerhalb der Versionierung)
Paketdetails: docs/remediation/paket-<N>.md — je Paket eine Datei, angelegt von dessen Zug 0
Scope: 11 Findings — alle 9 offenen des Audits (4 low, 5 info) plus 2 neue Befunde aus der Baseline · ausgenommen: acknowledged (PERF-003)
Scope-Regel: alles, jede Severity (auch info) und jede Kategorie, außer der bewussten Entscheidung für eventize und signalize — gilt auch für Befunde, die erst im Lauf auffallen
Kaltstarts: 2 Pakete × mindestens 3 Agenten ≈ 6, je Nachrunde zwei mehr · 5,5 Findings je Paket
Stand (2026-09-22): Lauf abgeschlossen · 3 Pakete committet (6bfd485, cadbd10, 3482685) · nichts blockiert · »Offene Befunde« leer · audit.html nachgeführt

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[r]` committet, Review wird nachgezogen · `[!]` blockiert.

## Neue Befunde aus der Baseline
Nicht im Audit, beim Messen der Baseline aufgefallen, unter der Scope-Regel im Lauf:
- NEW-1 (high, build): Der Publish-Job auf `main` scheitert mit `npm error 404 Not Found - PUT https://registry.npmjs.org/@spearwolf%2f…` (Run 35736078115). Die Checks sind grün, `NODE_AUTH_TOKEN` ist gesetzt, npm lehnt das Token ab. Folge: `@spearwolf/offscreen-display@0.3.0`, `rainbow-line@0.5.0` und `@spearwolf/astro-rainbow-line@1.4.0` sind nicht veröffentlicht (npm: 0.2.0 / 0.4.0 / 1.3.0). Ort: `.github/workflows/main.yml:53-66`, `scripts/publishNpmPkg.mjs`.
- NEW-2 (low, testing): `e2e/tests/astro-rainbow-line.spec.js:38` »passes its props through to the element« läuft in Firefox gelegentlich in den 5-s-Timeout von `expect.poll`, beobachtet unter `pnpm nx run-many -t build test e2e` (Vitest-Browser und Playwright parallel), in 5 Einzelläufen von `pnpm e2e` nicht. nx meldet den Task als flaky.

## Entscheidungen
- Die vier »Offenen Fragen« des Audits sind im Code entschieden und dokumentiert (Gnadenfrist von einem Frame vor `dispose()`, Kehrwert-Semantik von `cycle-colors-repeat` im README, Quell-Subpfade als öffentliche API mit optionalen Peers, Firefox und WebKit in e2e); sie werden im Abschluss aus der `audit.html` genommen (2026-09-22)
- Publish per npm Trusted Publishing (OIDC): `NODE_AUTH_TOKEN` fliegt aus dem Workflow, `id-token: write` bleibt; das Eintragen des Trusted Publishers je Paket auf npmjs.com ist Nutzeraktion und steht im Abschlussreport (2026-09-22)
- Frame-Loop drosselt wiederholte Listener-Fehler: der erste Fehler einer Serie erreicht den Main-Thread wie bisher als `error`-Event, identische Folgefehler werden unterdrückt, bis wieder ein Frame fehlerfrei durchläuft; der Loop läuft weiter (2026-09-22)
- Release-Tags setzt CI: nach erfolgreichem Publish legt `publishNpmPkg` den Tag `<paket>-v<version>` an und pusht ihn (Publish-Job bekommt `contents: write`); die Changelog-Vergleichslinks aller Pakete folgen diesem Schema. Die fehlenden Alt-Tags setzt der Nutzer einmalig selbst, die Kommandos stehen im Abschlussreport. Der Lauf selbst setzt und pusht keine Tags (2026-09-22)
- Paket 1: Release-Tags setzt ein eigener Job `tag` (`needs: publish`, `contents: write`, Checkout mit `fetch-depth: 0`, ohne `pnpm install` und ohne Build); er taggt je Paket die Version aus `package.json`, die auf npm liegt und als Tag `<name>-v<version>` noch fehlt, und pusht die Tags. Der Publish-Job bleibt bei `contents: read` + `id-token: write` und setzt selbst keinen Tag. Ersetzt in der Entscheidung zu den Release-Tags den Teil »publishNpmPkg legt den Tag an, Publish-Job bekommt contents: write« (2026-09-22, Nutzer auf Rückfrage des Reviewers)
- Paket 1: der verifizierte Stand aus Zug 1–4 liegt im Stash `remediation-paket-1-verifiziert-vor-tag-job` und wird weiterverwendet, nur der Tag-Teil wird umgebaut (2026-09-22, Orchestrator nach Nutzerentscheidung zum Tag-Job)
- Kein Versionssprung: 0.3.0 / 0.5.0 / 1.4.0 sind unveröffentlicht, die Änderungen dieses Laufs gehen in deren Changelog-Abschnitte; der astro-1.4.0-Eintrag über einen Fehler ohne Release fliegt raus. Der engere Parametertyp von `parseMessageData()` ist damit für niemanden breaking (2026-09-22)

## Konventionen
Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise, Commit-Messages:
- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs, auch nicht in der Commit-Message. Sie gehören diesem einen
  Audit, sind danach tot, und die Commit-Message überdauert den Lauf. Sie leben
  in diesem Plan und sonst nirgends; die Verbindung zwischen Finding und Commit
  trägt das Feld `Hash:` unter dem Paket — in genau der Richtung, in der jemand
  sie später sucht. Eine Commit-Message sagt in eigenen Worten, was sie ändert.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.
- Projektspezifisch: Commit-Messages englisch, klein beginnend, im Stil von `git log`; Code und Doku englisch; `CLAUDE.md` mitziehen, wo sie Verhalten beschreibt, das sich ändert (Publish, Frame-Loop).

## Vorbestehende Fehler
- `e2e/tests/astro-rainbow-line.spec.js:38` (Firefox) — sporadischer Timeout unter Parallellast, vor Lauf-Beginn vorhanden; ist zugleich NEW-2, behoben in Paket 2 (cadbd10).

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.
- [x] `e2e/tests/rainbow-line.spec.js:59` — sporadischer Firefox-Timeout unter Parallellast, gleiche Ursache wie NEW-2 (gesehen in Paket 1, Verify des Implementierers; Wiederholung grün) · Paket 1 · → Scope (gehört zu Paket 2, gleiche Ursache) · in Paket 2 aufgenommen (Zug 0, 2026-09-22), behoben mit cadbd10 (Playwright `expect.timeout` 15 s)

## Pakete

### [x] 1. Release-Pipeline: Trusted Publishing, CI-Tags, Changelog- und Skript-Hygiene
- Findings: NEW-1 (high), BUILD-004 (info), BUILD-005 (info, gegenstandslos: Fehlbefund, alle drei Variablen werden gebraucht — Fundstellen in der Paketdatei), CONS-002 (info)
- Ziel: Ein Push auf `main` veröffentlicht die Pakete per OIDC ohne Token und hinterlässt Tags, auf die die Changelog-Links zeigen.
- Bereich: `.github/workflows/main.yml` (Publish-Job und neuer Job `tag`), `scripts/publishNpmPkg.mjs`, `scripts/tagReleases.mjs` (neu), `packages/offscreen-display/CHANGELOG.md`, `packages/astro-rainbow-line/CHANGELOG.md`, `CLAUDE.md`
- Detail: docs/remediation/paket-1.md
- Hängt ab von: —
- Hash: 6bfd485
- Ergebnis: 3 Implementierer-Runden (1 vor der Blockade, Wiederaufnahme per Stash, 1 Nachrunde) · NEW-1, BUILD-004, CONS-002 behoben (Repo-Anteil), BUILD-005 gegenstandslos (Fehlbefund) · kein Bugfix mit Regressionstest (Release-Infrastruktur, belegt durch Clone-Test im Verify) · klein: Satz in `CLAUDE.md:67` nennt nicht alle roten Ausgänge des Jobs `tag`, Backoff-/Fehlerpfade von `tagReleases.mjs` ohne automatischen Test
- Nebenbefunde: → Queue (unverändert, der Firefox-Timeout-Eintrag)
- Folgen: —
- Schnittstellen: neues Skript `scripts/tagReleases.mjs` (`--dry-run`), neuer Workflow-Job `tag` (`needs: publish`, einziger Job mit `contents: write`) · Publish-Job ohne `NODE_AUTH_TOKEN`, `contents: read` + `id-token: write`
- Abschlussreport: Nutzeraktionen (Trusted Publisher je Paket auf npmjs.com, vier Alt-Tags mit belegten Commits, Push erst nach dem letzten Paket, danach Token-Secret löschen) stehen in der Paketdatei unter »Für den Abschlussreport«
- Begründung für 4 Findings: getrennt von Paket 2, weil Release-Infrastruktur und Laufzeitcode weder Ursache noch Gate noch Diff-Fläche teilen und NEW-1 (high) nicht neben Kosmetik im Laufzeitpaket stehen soll.

### [x] 2. Laufzeit und Tests: Frame-Fehler drosseln, Wertebereich, Typen, Testschärfe
- Findings: CORR-007 (info), CORR-006 (low), TYPES-002 (low), TYPES-003 (info), TEST-002 (low), TEST-003 (low), NEW-2 (low) · dazu der Queue-Eintrag `e2e/tests/rainbow-line.spec.js:59` (gleiche Ursache wie NEW-2)
- Ziel: Worker-Loop und rainbow-line verhalten sich bei Fehlern und Randwerten begrenzt, die veröffentlichten Typen sind eng und beschrieben, und die Tests unterscheiden, was sie unterscheiden sollen, ohne flaky zu sein.
- Bereich: `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js`, `packages/rainbow-line/src/RainbowLineWorkerDisplay.js`, `packages/offscreen-display/test/` (samt Fixture), `packages/rainbow-line/test/rainbowLineBehaviour.js`, `e2e/playwright.config.js` (statt der Specs), `e2e/types/consumer.ts`, `packages/astro-rainbow-line/rainbow-line-v0.5.0.js` (aus dem Build kopiert), READMEs und CHANGELOGs von offscreen-display und rainbow-line, `CLAUDE.md`
- Detail: docs/remediation/paket-2.md
- Hängt ab von: —
- Hash: cadbd10
- Ergebnis: 1 Runde · CORR-007, CORR-006, TYPES-002, TYPES-003, TEST-002, TEST-003, NEW-2 und der Queue-Eintrag `rainbow-line.spec.js:59` behoben · Regressionstests `reports an error that repeats in every frame once, until a frame runs without it` (vor dem Fix rot: 57 statt 1 Fehler), `draws the cycle-colors for a cycle-colors-repeat of 1e-320` / `1e308` (vor dem Fix rot, beide Varianten), Consumer-Typprobe `parseMessageData({'cycle-direction': 'left'})` (vor dem Fix TS2578), Fallback-Test mit überschriebener `devicePixelRatio` (Mutationslauf rot) · NEW-2 belegt nur durch grünen Lastlauf `run-many -t build test e2e` · klein: Umbruch in der `onCanvas`-Beschreibung, Drosselung ungetestet für Nicht-`Error`-Werte, Kommentar in `playwright.config.js` begründet das globale Timeout nur mit Firefox (Einzelheiten in der Paketdatei)
- Nebenbefunde: keine
- Folgen: —
- Schnittstellen: neue Typ-Exporte `OffscreenDisplayMessageProperties` (`@spearwolf/offscreen-display/worker.js`), `RainbowLineAttributes` und `RainbowLineMessage` (`rainbow-line/RainbowLineWorkerDisplay.js`) · `parseMessageData(data: RainbowLineMessage | null | undefined)` statt `Record<string, any>` · `OffscreenWorkerDisplay` meldet einen Frame-Fehler, der sich Frame um Frame wiederholt, nur einmal · Playwright `expect.timeout` 15 s

### [x] 3. Nachlese: Kleinbefunde der Reviewer aus Paket 1 und 2
- Folge von: Paket 1 (6bfd485), Paket 2 (cadbd10) — Kleinbefunde der Reviewer ohne eigene Runde, verursacht durch die Diffs dieses Laufs
- Findings (Folgen, Fundstellen im Stand cadbd10):
  - `CLAUDE.md:67` — der Satz zu den roten Ausgängen des Jobs `tag` liest sich abschließend, nennt aber nicht alle (unbrauchbarer `gitHead`, anderer `npm view`-Fehler, gescheitertes `git tag`) (aus Paket 1)
  - `scripts/tagReleases.mjs:100` — rund 100 s Wartezeit auf die Registry kann bei langsamem CDN zu kurz sein; Wartezeit so bemessen oder einstellbar machen, dass ein normaler Registry-Verzug nicht rot endet (aus Paket 1)
  - `scripts/tagReleases.mjs` — E404-Backoff, `-dev`-Skip und die drei Fehlermeldungen zu `gitHead` sind ungetestet; automatischer Test, etwa mit `npm`-Shim im `PATH` gegen einen Wegwerf-Clone, im bestehenden Verify-Gate (aus Paket 1)
  - `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js:24` — Umbruch in der `onCanvas`-Beschreibung trennt »the« von »canvas«, sichtbar in der erzeugten `.d.ts` (aus Paket 2)
  - `packages/offscreen-display/test/offscreen-display.test.js:253` — die Drosselung wiederholter Frame-Fehler ist nur für `Error`-Instanzen getestet, der `Object.is`-Zweig für andere geworfene Werte (`OffscreenWorkerDisplay.js:191`) nicht (aus Paket 2)
  - `e2e/playwright.config.js:17-18` — der Kommentar begründet das globale `expect.timeout` nur mit Firefox, nicht damit, dass WebKit in CI dieselbe Lastursache trifft (aus Paket 2)
- Nicht aufgenommen, weil nicht behebbar: Länge einer committeten Commit-Message (Historie), doppelte `@typedef`-Kommentare in der `.d.ts` (Verhalten von tsc 7, nicht dieses Codes)
- Ziel: Die Hinterlassenschaften der Pakete 1 und 2 sind behoben, sodass der Lauf keine eigenen Folgen ins Audit übergibt.
- Bereich: `scripts/tagReleases.mjs`, `e2e/tests/tag-releases.spec.js` (neu), `e2e/playwright.config.js`, `CLAUDE.md`, `packages/offscreen-display/src/lib/worker/OffscreenWorkerDisplay.js` (nur Kommentar), `packages/offscreen-display/test/offscreen-display.test.js` samt Fixture `test/fixtures/test-display.worker.js`
- Detail: docs/remediation/paket-3.md
- Hängt ab von: —
- Hash: 3482685
- Ergebnis: 1 Runde · alle sechs Folgen behoben (Reviewer: freigeben, keine Befunde) · neue Spec `e2e/tests/tag-releases.spec.js` (8 Tests, nur chromium; Mutationsläufe rot: Backoff abgeschaltet → 2 Tests, Prüfung der Wartezeiten entfernt → 2 Tests) · Test `reports a thrown value that is not an Error once while the same value repeats in every frame` (Mutationslauf rot: 57 statt 1 Fehler) · Wartezeit auf die Registry 360 s statt 100 s
- Nebenbefunde: keine
- Folgen: —
- Schnittstellen: `scripts/tagReleases.mjs` liest `TAG_RELEASES_RETRY_DELAYS` (Sekunden, kommagetrennt; ungültig → Exit 1 vor jedem `npm`-Aufruf), Default `10,20,30,60,60,60,60,60` · `e2e/playwright.config.js`: Konstante `nodeOnlySpecs` (browserlose Specs nur in chromium) · Fixture-Nachricht `throwValueInEveryFrame` in `packages/offscreen-display/test/fixtures/test-display.worker.js`
