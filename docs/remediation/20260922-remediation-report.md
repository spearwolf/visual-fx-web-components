# Remediation-Report — visual-fx-web-components, 2026-09-22

Zwei Läufe am selben Tag: der erste hat das Audit abgearbeitet, der zweite die Kleinbefunde, die der erste im Audit hinterlassen hat, und drei Befunde aus der Baseline. Der zweite steht unten.

Quelle: ./audit.html vom 2026-09-22 · Branch: main · Commits: cdafb38..999823e
Scope-Regel: alles, jede Severity und jede Kategorie, außer der bewussten Entscheidung für eventize und signalize — gilt auch für Befunde, die erst im Lauf auffallen

## Lauf
- Ziel: Alle Findings des Audits beheben, einschließlich des Optimierungspotenzials; die Nutzung von `@spearwolf/eventize` und `@spearwolf/signalize` im Worker bleibt als bewusste Entscheidung bestehen.
- 4 Pakete geplant, 6 gefahren: davon 1 Folgepaket (Nachtrag zu den Changelogs, Testaussagen und Tests aus dem Lebenszyklus-Umbau) und 1 aus der Befund-Queue
- 19 Findings geschlossen, 0 entfielen als gegenstandslos, 6 Commits; dazu 15 Nebenbefunde, die auch ohne den Lauf falsch waren, und 7 Folgen eigener Änderungen, alle behoben
- Blockiert: keines
- Ins Audit zurück: 0 Nebenbefunde; neu im Audit stehen 9 Kleinbefunde der Reviewer (alle low oder info), keiner mit offener Architekturfrage
- Verify am Ende: `E2E_SKIP_WEBKIT=1 pnpm verify` ✓ (lint, typecheck, build, test, e2e in Chromium und Firefox), zusätzlich `nx run-many -t build test e2e --skip-nx-cache` ✓. Baseline: lint ✗ nur wegen `audit.html` (jetzt vom Biome-Check ausgenommen), sonst ✓. Das WebKit-Projekt der e2e-Suite startet auf dieser Maschine nicht (CachyOS: ICU 78 statt 74, kein flite); es läuft erst in CI.
- audit.html: Score 53 → 96, 19 geschlossen, 9 neu, PERF-003 acknowledged

Offen für den Nutzer, lokal nicht prüfbar: ob der Workflow samt npm-Provenance und das WebKit-Projekt in GitHub Actions durchlaufen und ob Dependabot mit pnpm 11 zurechtkommt. Die Tags `rainbow-line-v0.4.0` (auf `896de45`) und `rainbow-line-v0.5.0` fehlen, der Changelog verlinkt sie.

## Tokenverbrauch

Stand 2026-09-22 13:41, gezählt aus den Reportdateien in `/tmp/claude-1000/-home-spw-spaceland-visual-fx-web-components/09543aa0-4d6e-4d0f-8ffc-49168ab25958/scratchpad`.
Die Schleife schreibt diesen Abschnitt bei jedem Ausgang neu; er zählt, was
bis dahin verbraucht wurde. Was der Abschluss selbst noch kostet, steht nicht
darin — er läuft danach.

```
  Paket  Prozesse    Eingabe    Ausgabe
  1             4      12.7M     101.6k  Build, Release und CI absichern
  2             4      13.1M     156.7k  offscreen-display: Lebenszyklus, Frame-Loop u…
  3             4      11.0M     151.6k  rainbow-line: Attribute validieren, Zeichenro…
  4             4      20.3M     203.6k  Typen, Dokumentation und Release-Stand
  5             4       7.8M      69.7k  Nachtrag zu Paket 2: Changelogs, Testaussage …
  6             5      26.2M     125.3k  Nebenbefunde aus der Queue: Worker-Pfad des Q…
  Steuer        1       4.9M      21.9k  Plan, Start, Abschluss — die Session daneben
  ------ -------- ---------- ----------
  gesamt       26      96.0M     830.3k

  Ausgabe je Modell: claude-opus-5 742.0k · claude-sonnet-5 88.3k
```

## Semver-Empfehlung
Auf ausdrückliche Entscheidung des Nutzers hat der Lauf die Versionen selbst angehoben (offscreen-display 0.3.0, rainbow-line 0.5.0, astro-rainbow-line 1.4.0).
- `@spearwolf/offscreen-display` — minor (unter 1.0, breaking): 0.2.0 → 0.3.0 passt. `onResize` meldet die Canvas-Größe in physischen Pixeln samt `pixelRatio`; Subklassen, die in CSS-Pixeln zeichnen, müssen umrechnen.
- `rainbow-line` — minor (unter 1.0, breaking): 0.4.0 → 0.5.0 passt. `@spearwolf/eventize` und `@spearwolf/offscreen-display` sind nur noch optionale Peers; wer die Quell-Subpfade importiert, installiert sie selbst.
- `@spearwolf/astro-rainbow-line` — major: 1.3.0 → 2.0.0 empfohlen statt der gesetzten 1.4.0. Die neue Peer-Anforderung `astro >=5` lässt die Installation in Astro-4-Projekten scheitern. Wer 1.4.0 behält, nimmt die Anforderung vor dem Release wieder heraus oder akzeptiert den Bruch bewusst.
Keine weitere Anhebung vorgenommen.

---

# Zweiter Lauf

Quelle: ./audit.html vom 2026-09-22, nachgeführt durch den ersten Lauf · Branch: main · Commits: 6bfd485..3482685
Scope-Regel: alles, jede Severity (auch info) und jede Kategorie, außer der bewussten Entscheidung für eventize und signalize — gilt auch für Befunde, die erst im Lauf auffallen

## Lauf
- Ziel: Das Audit vollständig abräumen, einschließlich der Befunde, die erst beim Messen der Baseline auffielen, damit neue Features auf einer stabilen Basis entstehen.
- 2 Pakete geplant, 3 gefahren: davon 1 Folgepaket (die sechs Kleinbefunde, die die Reviewer der beiden ersten Pakete hinterlassen hatten), 0 aus der Befund-Queue (ihr einziger Eintrag, ein zweiter Firefox-Timeout derselben Ursache, lief in Paket 2 mit)
- 9 Findings geschlossen, davon 1 als gegenstandslos (die angeblich ungenutzten Variablen in `scripts/makePackageJson.mjs` werden alle gebraucht), 3 Commits; dazu 3 Nebenbefunde (der Publish-Job scheiterte in CI mit `E404`, weshalb 0.3.0 / 0.5.0 / 1.4.0 nie auf npm ankamen; sporadische Firefox-Timeouts in zwei e2e-Specs unter Parallellast) und 8 Folgen eigener Änderungen, alle behoben
- Entscheidungen: Publish per npm Trusted Publishing (OIDC) statt Token; Release-Tags setzt ein eigener CI-Job `tag` mit `contents: write`, der Publish-Job bleibt lesend (auf Einwand des Reviewers: ein schreibendes `GITHUB_TOKEN` neben `pnpm install` und npm-Lifecycle-Scripts wäre eine Supply-Chain-Fläche); wiederholte Frame-Fehler meldet der Worker einmal je Serie; kein Versionssprung, die Änderungen gehen in die unveröffentlichten 0.3.0 / 0.5.0 / 1.4.0
- Blockiert: keines (Paket 1 hielt einmal für die Entscheidung zum Tag-Job an und wurde auf dem gesicherten Stand fortgesetzt)
- Ins Audit zurück: 0
- Verify am Ende: `pnpm lint` ✓ · `pnpm typecheck` ✓ · `pnpm nx run-many -t build test e2e --skip-nx-cache` ✓ in zwei Läufen, dazu `pnpm verify` ✓ nach Paket 2. Baseline: alles ✓, e2e nur in 5 von 6 Läufen.
- audit.html: Score 96 → 100, 9 geschlossen, 0 neu, die vier offenen Fragen entfernt (im Code entschieden), PERF-003 bleibt acknowledged

## Was nur du tun kannst
1. **Trusted Publisher eintragen**, je Paket auf npmjs.com → Package → Settings → Trusted publishing → GitHub Actions: Organization or user `spearwolf`, Repository `visual-fx-web-components`, Workflow filename `main.yml`, Environment leer. Für `@spearwolf/offscreen-display`, `rainbow-line`, `@spearwolf/astro-rainbow-line`. Ohne diesen Eintrag scheitert der Publish-Job weiter mit `E404`.
2. **Dann pushen.** Der erste Push auf `main` veröffentlicht 0.3.0 / 0.5.0 / 2.0.0; danach setzt der Job `tag` `offscreen-display-v0.3.0`, `rainbow-line-v0.5.0` und `astro-rainbow-line-v2.0.0` selbst.
3. **Alt-Tags einmalig setzen** (Commits belegt über `npm view <paket>@<version> gitHead`):
   ```bash
   git tag offscreen-display-v0.1.2 142bff6
   git tag offscreen-display-v0.2.0 896de45
   git tag rainbow-line-v0.4.0 896de45
   git tag astro-rainbow-line-v1.3.0 896de45
   git push origin offscreen-display-v0.1.2 offscreen-display-v0.2.0 rainbow-line-v0.4.0 astro-rainbow-line-v1.3.0
   ```
4. **Nach dem ersten erfolgreichen OIDC-Publish** das Secret entfernen (`gh secret delete NPM_AUTH_TOKEN`) und auf npmjs.com je Paket unter Settings → Publishing access »Require two-factor authentication and disallow tokens« wählen.
5. **Fehlt nach einem Publish ein Tag** (Job `tag` rot, etwa weil die Registry die Version nach 360 s noch nicht listet): den Job `tag` im Workflow-Lauf neu starten; die Wartezeit ist über `TAG_RELEASES_RETRY_DELAYS` einstellbar.

### Tokenverbrauch

Stand 2026-09-22 17:28, gezählt aus den Reportdateien in `/tmp/claude-1000/-home-spw-spaceland-visual-fx-web-components/ffbbf9b0-069c-482f-bc17-882a0bf45c29/scratchpad`.
Die Schleife schreibt diesen Abschnitt bei jedem Ausgang neu; er zählt, was
bis dahin verbraucht wurde. Was der Abschluss selbst noch kostet, steht nicht
darin — er läuft danach.

```
  Paket  Prozesse    Eingabe    Ausgabe
  1             8      13.7M     172.3k  Release-Pipeline: Trusted Publishing, CI-Tags…
  2             4      19.3M     132.0k  Laufzeit und Tests: Frame-Fehler drosseln, We…
  3             4      12.0M      96.4k  Nachlese: Kleinbefunde der Reviewer aus Paket…
  Steuer        1       5.7M      27.6k  Plan, Start, Abschluss — die Session daneben
  ------ -------- ---------- ----------
  gesamt       17      50.7M     428.2k

  Ausgabe je Modell: claude-opus-5 311.8k · claude-sonnet-5 116.4k
```

## Semver-Empfehlung
Die drei Versionen sind unveröffentlicht; dieser Lauf ändert die Stufe gegenüber den veröffentlichten Ständen nicht.
- `@spearwolf/offscreen-display` — minor (unter 1.0, breaking): 0.2.0 → 0.3.0 passt. Bestimmend bleibt `onResize` in physischen Pixeln; neu ist nur der Typ-Export `OffscreenDisplayMessageProperties`.
- `rainbow-line` — minor (unter 1.0, breaking): 0.4.0 → 0.5.0 passt. Zusätzlich verengt `parseMessageData(data: RainbowLineMessage | null | undefined)` den Parametertyp des Quell-Subpfads.
- `@spearwolf/astro-rainbow-line` — major: 1.3.0 → 2.0.0 empfohlen, unverändert gegenüber dem ersten Lauf. Die Peer-Anforderung `astro >=5` lässt die Installation in Astro-4-Projekten scheitern. Nachtrag 2026-09-24: der Nutzer hat die Empfehlung übernommen, das Paket steht auf 2.0.0.
Keine Anhebung vorgenommen.
