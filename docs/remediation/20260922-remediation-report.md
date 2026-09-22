# Remediation-Report — visual-fx-web-components, 2026-09-22

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
