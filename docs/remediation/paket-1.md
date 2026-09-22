# Paket 1 — Build, Release und CI absichern

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: BUILD-002 (medium), BUILD-003 (low), DX-002 (low), DEP-001 (low)
- Nebenbefund aufgenommen (gleiche Ursache wie BUILD-003): `scripts/publishNpmPkg.mjs:59` `preparePackageRoot()` — siehe Abgleich
- Ziel: Lint-Baseline grün, Publish-Reihenfolge und -Fehlerbehandlung verlässlich, CI auf Pull Requests, Dependencies passend zum Geschippten.
- Modell: mittlere Stufe (sonnet)
- Effort: medium
- Arbeitsverzeichnis für Logs und Vergleichsdateien: `/tmp/claude-1000/-home-spw-spaceland-visual-fx-web-components/09543aa0-4d6e-4d0f-8ffc-49168ab25958/scratchpad` (im Folgenden `$ARBEITSDIR`; nichts davon ins Projekt)
- Dateien:
  - geändert: `biome.json`, `.gitignore`, `nx.json`, `scripts/publishNpmPkg.mjs`, `scripts/makePackageJson.mjs`, `.github/workflows/main.yml`, `packages/offscreen-display/package.json`, `packages/rainbow-line/package.json`, `packages/rainbow-line/scripts/buildPackage.mjs`, `packages/astro-rainbow-line/package.json`, `packages/astro-rainbow-line/README.md`, `packages/offscreen-display/CHANGELOG.md`, `packages/rainbow-line/CHANGELOG.md`, `e2e/tests/npm-packages.spec.js`, `README.md`, `CLAUDE.md`, `pnpm-lock.yaml` (durch `pnpm install`)
  - neu: `.github/dependabot.yml`, `packages/astro-rainbow-line/CHANGELOG.md`
  - gelöscht: `packages/offscreen-display/.npmignore`, `packages/rainbow-line/.npmignore`, `TODO.md`
  - **nicht** anfassen: `packages/astro-rainbow-line/.npmignore` — dieses Paket wird aus seinem eigenen Verzeichnis veröffentlicht (`publishNpmPkg.mjs .`), die Datei wirkt dort. `audit.html`, `remediation-plan.md`, `docs/remediation/`.

## Vorgehen

Nichts committen, nichts stagen (kein `git add`, kein `git rm` — Dateien mit
`rm` löschen). Reihenfolge einhalten: die roten Läufe in Schritt 2 kommen vor
jeder Änderung an `nx.json`, den `package.json`-Dateien und
`buildPackage.mjs`, ihre Ausgabe gehört in den Report.

1. **Lint-Baseline.** In `biome.json` unter `files.includes` den Eintrag
   `"!audit.html"` ergänzen (direkt nach `"!**/pnpm-lock.yaml"`). `audit.html`
   ist ein generierter Report, kein Quelltext. `pnpm lint` muss danach mit
   Exit 0 enden (vorher: 24 Fehler, 141 Warnungen, 101 Infos, alle in
   `audit.html`).

2. **Rote Läufe festhalten, bevor etwas anderes geändert wird.**
   1. Publish-Reihenfolge — dieses Kommando endet heute mit Exit 1 und gibt
      `[ 'rainbow-line:buildNpmPkg' ]` aus (`--graph=stdout` druckt nur den
      Taskgraph und führt nichts aus):
      ```sh
      pnpm nx run rainbow-line:publishNpmPkg --graph=stdout | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>{const deps=JSON.parse(s.slice(s.indexOf('{'))).tasks.dependencies['rainbow-line:publishNpmPkg'];console.log(deps);process.exit(deps.includes('offscreen-display:publishNpmPkg')?0:1);})"
      ```
   2. `pnpm nx run-many -t buildNpmPkg`, dann die beiden erzeugten Manifeste
      für den Vergleich in Schritt 10 sichern:
      `cp packages/offscreen-display/.npm-pkg/package.json $ARBEITSDIR/paket-1.before.offscreen-display.package.json` und
      `cp packages/rainbow-line/.npm-pkg/package.json $ARBEITSDIR/paket-1.before.rainbow-line.package.json`.
   3. `e2e/tests/npm-packages.spec.js` auf den Zielzustand umschreiben (Werte
      unten), dann nur diese Spec laufen lassen und rot sehen:
      `pnpm --dir e2e exec playwright test tests/npm-packages.spec.js`.
      Erwartet rot: `repository` fehlt (beide Pakete), `CHANGELOG.md` fehlt in
      `rainbow-line/.npm-pkg`, `peerDependencies` fehlt bei rainbow-line.
      - Im Test `has a publishable package.json`: die `workspace:`-Prüfung
        über `Object.values({...pkg.dependencies, ...pkg.peerDependencies})`
        laufen lassen und ergänzen:
        ```js
        expect(pkg.repository).toEqual({
          type: 'git',
          url: 'git+https://github.com/spearwolf/visual-fx-web-components.git',
          directory: `packages/${name}`,
        });
        ```
      - Im Test `contains every file its package.json refers to`:
        `expect(existsSync(new URL('CHANGELOG.md', packageDir))).toBe(true);`
        neben den Prüfungen für `LICENSE` und `README.md`.
      - Den Test `rainbow-line depends on the current version of
        offscreen-display` ersetzen durch `rainbow-line declares eventize and
        offscreen-display as optional peer dependencies`:
        ```js
        const offscreenDisplay = readJson(new URL('offscreen-display/package.json', packagesDir));
        const source = readJson(new URL('rainbow-line/package.json', packagesDir));
        const rainbowLine = readJson(new URL('rainbow-line/.npm-pkg/package.json', packagesDir));

        expect(rainbowLine).not.toHaveProperty('dependencies');
        expect(rainbowLine.peerDependencies).toEqual({
          '@spearwolf/eventize': source.peerDependencies['@spearwolf/eventize'],
          '@spearwolf/offscreen-display': `^${offscreenDisplay.version.replace(/-dev$/, '')}`,
        });
        expect(rainbowLine.peerDependenciesMeta).toEqual({
          '@spearwolf/eventize': {optional: true},
          '@spearwolf/offscreen-display': {optional: true},
        });
        ```
        (`source.peerDependencies` gibt es vor Schritt 6 nicht — der Test
        wirft dann einen TypeError; auch das zählt als rot.)
      - Den Kommentar in Zeile 4 der Spec (über die Verzeichnisse, die
        `pnpm publishNpmPkg` an `npm publish` übergibt) stehen lassen; nach
        Schritt 4 und 5 stimmt er wörtlich.

3. **Publish-Reihenfolge.** In `nx.json` unter `targetDefaults.publishNpmPkg`
   `"dependsOn": ["buildNpmPkg", "^publishNpmPkg"]`. Damit veröffentlicht nx
   `offscreen-display` vor `rainbow-line`, und scheitert der erste Publish,
   startet der zweite nicht. Das Kommando aus 2.1 endet danach mit Exit 0 und
   listet `offscreen-display:publishNpmPkg`.

4. **`scripts/publishNpmPkg.mjs` umschreiben** — synchron, jede Fehlerlage mit
   Meldung und Exit 1:
   - Import nur noch `{execSync}` aus `node:child_process`; `exec` fällt weg.
   - Token-Zeile: `console.log(' - NODE_AUTH_TOKEN:', process.env.NODE_AUTH_TOKEN ? 'set' : 'unset');`
     — kein Präfix des Tokens mehr im Log (GitHub maskiert nur das ganze
     Secret).
   - Den Callback-`exec` (Zeilen 27–47) ersetzen durch eine Funktion
     `fetchPublishedVersions(name)` und einen linearen Ablauf:
     ```js
     const versions = fetchPublishedVersions(pkgJson.name);
     console.log('already published versions: ---');
     console.dir(versions);

     if (versions.includes(pkgJson.version)) {
       console.warn('skip publishing, version', pkgJson.version, 'is already released');
       process.exit(0);
     }

     publishPackage();

     function fetchPublishedVersions(name) {
       try {
         const stdout = execSync(`npm show ${name} versions --json`, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
         // npm prints a single version as a plain string instead of an array
         return [JSON.parse(stdout)].flat();
       } catch (error) {
         if (error.stderr?.toString().includes('E404')) {
           console.log('oh it looks like this is the first time to publish the package');
           return [];
         }
         console.error(`npm show ${name} failed:`, error.stderr?.toString() || error.message);
         process.exit(1);
       }
     }
     ```
     Das Normalisieren auf ein Array ist Absicht: auf einem String prüft
     `includes` Teilstrings, `'10.1.0'.includes('0.1.0')` ist `true`.
   - `publishPackage(dryRun = DRY_RUN)`:
     ```js
     function publishPackage(dryRun = DRY_RUN) {
       try {
         execSync(`npm publish --access public${dryRun ? ' --dry-run' : ''}`, {cwd: packageRoot, stdio: 'inherit'});
       } catch (error) {
         console.error(`npm publish failed for ${pkgJson.name}@${pkgJson.version} (exit code ${error.status ?? 'unknown'})`);
         process.exit(1);
       }
     }
     ```
     `stdio: 'inherit'`, damit die Ausgabe von `npm publish` im CI-Log steht.
     Kein `process.exit(0)` am Ende nötig.
   - **Nebenbefund, gleiche Ursache wie BUILD-003:** `preparePackageRoot()`
     und `copyFile()` (Zeilen 59–76) samt dem Aufruf in `publishPackage`
     entfernen, ebenso die dann unbenutzte Konstante `workspaceRoot`, ihre
     Log-Zeile und den Import von `fileURLToPath` (Biome meldet unbenutzte
     Imports als Fehler). Begründung im Abgleich unten. `projectRoot`, `packageRoot`,
     `DRY_RUN` und die `-dev`-Prüfung bleiben.
   - Smoke-Test des Fehlerpfads (braucht Netz für `npm show`; ohne Netz im
     Report vermerken und weiter). In `$ARBEITSDIR/publish-smoke/pkg/` eine
     `package.json` mit `{"name": "@spearwolf/remediation-smoke-does-not-exist", "version": "not-a-version", "private": true}`
     anlegen, dann aus `$ARBEITSDIR/publish-smoke/` heraus
     `node /home/spw/spaceland/visual-fx-web-components/scripts/publishNpmPkg.mjs pkg --dry-run; echo "exit=$?"`.
     Erwartet: `NODE_AUTH_TOKEN: unset`, die Erstveröffentlichungs-Meldung
     (E404), dann ein Fehler von `npm publish --dry-run` (ungültige Version),
     die Zeile `npm publish failed for @spearwolf/remediation-smoke-does-not-exist@not-a-version (exit code …)`
     und `exit=1`. `private: true` und `--dry-run` sind doppelte Sicherung —
     veröffentlicht wird dabei nichts. Ausgabe in den Report.

5. **Tote Publish-Reste entfernen.**
   - `rm packages/offscreen-display/.npmignore packages/rainbow-line/.npmignore`
     — veröffentlicht wird aus `.npm-pkg/`, das `buildPackage.mjs` per
     Whitelist befüllt; die Dateien filtern nichts.
   - `scripts/makePackageJson.mjs`: Zeile 28
     (`[[outPackageJson, ['main', 'module', 'types']], [outPackageJson.exports]].forEach(removeDistPathPrefix);`)
     sowie `removeDistPathPrefix`, `removePathPrefixAt` und die
     Trennkommentar-Zeile davor (Zeilen 82–107) entfernen. Die Quell-
     `package.json` enthalten den Präfix `.npm-pkg/` nirgends. `targetSubDir`
     bleibt — es bestimmt `packageRoot`.
   - `packages/rainbow-line/scripts/buildPackage.mjs`: `'CHANGELOG.md'` in
     `COPY_FILES` aufnehmen (nach `'README.md'`). Damit liegt in `.npm-pkg/`
     genau das, was veröffentlicht wird; `offscreen-display` kopiert sein
     Changelog dort schon.
   - `TODO.md`: `rm TODO.md`; in `.gitignore` unter `# misc` die Zeile
     `/TODO.md` ergänzen; in `biome.json` den Eintrag `"!**/TODO.md"`
     entfernen (`vcs.useIgnoreFile` hält gitignorierte Dateien ohnehin aus dem
     Check). `pnpm make:todo` und `scripts/makeTODO.mjs` bleiben unverändert.
   - `README.md` Zeile 40 ersetzen; aus
     ```markdown
     > An overview of open issues can be found in [TODO.md](TODO.md).
     ```
     wird
     ```markdown
     > Run `pnpm make:todo` to collect them into a local, gitignored `TODO.md`.
     ```
     (Zeile 39 bleibt.)

6. **Manifeste.**
   - Allen drei Paketen ein `repository`-Feld geben — npm verlangt es für
     Provenance, `repository.url` muss zum GitHub-Repo passen:
     ```json
     "repository": {
       "type": "git",
       "url": "git+https://github.com/spearwolf/visual-fx-web-components.git",
       "directory": "packages/<verzeichnis>"
     }
     ```
     mit `directory` = `packages/offscreen-display`, `packages/rainbow-line`,
     `packages/astro-rainbow-line`. Platz: bei `offscreen-display` und
     `rainbow-line` nach `license`, bei `astro-rainbow-line` nach `homepage`.
   - `packages/rainbow-line/package.json`: den Block `dependencies` ersetzen
     durch
     ```json
     "devDependencies": {
       "@spearwolf/eventize": "^6.2.0",
       "@spearwolf/offscreen-display": "workspace:*",
       "vite": "^8.3.0"
     },
     "peerDependencies": {
       "@spearwolf/eventize": "^6.2.0",
       "@spearwolf/offscreen-display": "workspace:*"
     },
     "peerDependenciesMeta": {
       "@spearwolf/eventize": {"optional": true},
       "@spearwolf/offscreen-display": {"optional": true}
     }
     ```
     (der bestehende `devDependencies`-Block mit `vite` geht darin auf).
     `workspace:*` im Peer ist Absicht: `makePackageJson.mjs` löst es beim
     Paketbau auf `^<version>` von offscreen-display auf
     (`resolveDependencies(outPackageJson.peerDependencies)`), ein späterer
     Versionsbump zieht den Peer-Bereich damit von selbst nach. pnpm 11
     akzeptiert `workspace:*` im Peer (in Zug 0 an einem Wegwerf-Workspace
     geprüft); die devDependency sorgt dafür, dass Build, Tests und der
     nx-Projektgraph (`^build`, `^publishNpmPkg`) die Abhängigkeit weiter
     sehen. Die Quell-Subpfade `./RainbowLineElement.js` und
     `./RainbowLineWorkerDisplay.js` bleiben in `exports` (Entscheidung im
     Plan).
   - `packages/astro-rainbow-line/package.json`:
     `"peerDependencies": {"astro": ">=5"}` vor `devDependencies`; die
     devDependency `astro ^7.3.3` bleibt.
   - `pnpm install` im Repo-Root, damit `pnpm-lock.yaml` nachzieht; danach
     muss `pnpm install --frozen-lockfile` durchlaufen (CI installiert
     frozen).

7. **Workflow und Dependabot.**
   - `.github/workflows/main.yml`:
     ```yaml
     on:
       push:
         branches: ['main']
       pull_request: {}

     permissions:
       contents: read
     ```
     Job `ci` bleibt sonst unverändert. Job `publish` bekommt nach
     `needs: ci`:
     ```yaml
         if: github.event_name == 'push' && github.ref == 'refs/heads/main'
         runs-on: ubuntu-latest
         permissions:
           contents: read
           id-token: write
         concurrency:
           group: publish
           cancel-in-progress: false
     ```
     und im Schritt `Publish npm packages` neben `NODE_AUTH_TOKEN` die
     Variable `NPM_CONFIG_PROVENANCE: 'true'`.
     Abweichung von der Empfehlung (`npm publish --provenance` im Skript):
     Provenance über die Umgebung des CI-Schritts, weil das Skript auch
     lokal läuft (`--dry-run`) und `--provenance` außerhalb von GitHub
     Actions abbricht. Der Ref-Vergleich im `if` hält den Schutz auch dann,
     wenn `on.push` später weitere Branches bekommt. Das Repo ist öffentlich
     (in Zug 0 per `gh repo view` geprüft) — Voraussetzung für Provenance.
   - `.github/dependabot.yml` neu:
     ```yaml
     version: 2
     updates:
       - package-ecosystem: npm
         directory: /
         schedule:
           interval: monthly
         groups:
           minor-and-patch:
             update-types: [minor, patch]
       - package-ecosystem: github-actions
         directory: /
         schedule:
           interval: monthly
     ```
     Die Gruppe bündelt Minor- und Patch-Updates in einen PR pro Monat — für
     einen einzelnen Maintainer; Majors kommen einzeln, weil sie brechen
     können. Ob Dependabot mit pnpm 11 zurechtkommt, zeigt sich erst auf
     GitHub; lokal nicht prüfbar, im Report vermerken.

8. **Changelogs** (Keep-a-Changelog, Einträge unter `## [Unreleased]`,
   Wortlaut exakt wie in den Blöcken):
   - `packages/offscreen-display/CHANGELOG.md`: neuer Abschnitt nach dem
     bestehenden `### Fixed`:
     ```markdown
     ### Changed

     - published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); `package.json` names the source `repository`
     ```
   - `packages/rainbow-line/CHANGELOG.md`: im bestehenden `### Changed` unter
     `## [Unreleased]` zwei Punkte anhängen:
     ```markdown
     - `@spearwolf/eventize` and `@spearwolf/offscreen-display` are optional peer dependencies: `bundle.js`, `rainbow-line.js` and `rainbow-line.worker.js` are self-contained, only the source subpaths `./RainbowLineElement.js` and `./RainbowLineWorkerDisplay.js` import them
     - published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); `package.json` names the source `repository`
     ```
   - `packages/astro-rainbow-line/CHANGELOG.md` **neu**, vollständiger
     Inhalt:
     ```markdown
     # Changelog for package [@spearwolf/astro-rainbow-line](https://github.com/spearwolf/visual-fx-web-components/tree/main/packages/astro-rainbow-line)

     All notable changes to this project will be documented in this file.

     The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
     and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

     ## [Unreleased]

     ### Changed

     - `astro` (`>=5`) is a peer dependency
     - published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements); `package.json` names the source `repository`

     ## [1.3.0] - 2024-12-12

     ### Changed

     - update `rainbow-line` web component to `0.4.0`
     ```
     Der 1.3.0-Eintrag kommt aus dem README. Grund für die neue Datei: die
     Konvention verlangt den Eintrag in der `CHANGELOG.md` des Pakets, und
     dieses Paket hatte keine.
   - `packages/astro-rainbow-line/README.md`: den Abschnitt ab `## CHANGELOG`
     bis Dateiende (`### 1.3.0 (2024-12-12)` und sein Punkt) ersetzen durch
     ```markdown
     ## CHANGELOG

     See [CHANGELOG.md](CHANGELOG.md).
     ```
     Der Text darüber bleibt (den überarbeitet Paket 4).

9. **`CLAUDE.md`** an das Geänderte angleichen, nur diese fünf Stellen:
   - Commands, die Zeile zu `make:todo` wird:
     ```
     pnpm make:todo                   # collect TODO/FIXME/XXX comments into a local, gitignored TODO.md
     ```
   - Absatz „Formatting and linting is Biome …“: ans Absatzende (nach dem
     Satz über `.astro`/`noTsIgnore`) anhängen:
     ```
     The generated `audit.html` is excluded.
     ```
   - Architecture/rainbow-line, der Punkt „Depends on
     `@spearwolf/offscreen-display` via `workspace:*`, so nx builds
     offscreen-display first.“ wird:
     ```
     - Takes `@spearwolf/offscreen-display` (`workspace:*`) and `@spearwolf/eventize` as devDependencies and as optional peerDependencies: the built files inline both, only the source subpaths `./RainbowLineElement.js` and `./RainbowLineWorkerDisplay.js` import them. nx builds and publishes offscreen-display first.
     ```
   - Architecture/astro-rainbow-line: an den Absatz anhängen:
     ```
     `astro` (`>=5`) is a peerDependency.
     ```
   - Release/publishing: nach dem ersten Absatz (endet mit „… versions
     ending in `-dev`.“) einen neuen Absatz einfügen:
     ```
     nx publishes a package only after the workspace packages it depends on (`^publishNpmPkg`), so `offscreen-display` goes out before `rainbow-line` and a failed publish stops its dependents. The workflow runs the checks on pull requests as well, but publishes only on push to `main`, one run at a time (`concurrency: publish`) and with npm provenance (`NPM_CONFIG_PROVENANCE`, which needs the `repository` field in each package's `package.json`).
     ```
     und den bisherigen zweiten Absatz ersetzen durch:
     ```
     For `offscreen-display` and `rainbow-line`, `buildNpmPkg` assembles a separate `.npm-pkg/` directory that holds exactly what `npm publish` receives: the package's `scripts/buildPackage.mjs` copies the built files, then `scripts/makePackageJson.mjs` writes the published `package.json` — resolving `workspace:*` in `dependencies` and `peerDependencies` to `^<version>` of the sibling package and applying `package.override.json` (a `null` value deletes the key, used to drop `scripts`/`devDependencies`). `astro-rainbow-line` publishes its directory as-is.
     ```

10. **Vergleich der erzeugten Manifeste.** `pnpm nx run-many -t buildNpmPkg`,
    dann `diff` gegen die Sicherungen aus 2.2. Erlaubte Unterschiede:
    offscreen-display nur `repository`; rainbow-line `repository`,
    `dependencies` entfällt, `peerDependencies` =
    `{"@spearwolf/eventize": "^6.2.0", "@spearwolf/offscreen-display": "^0.2.0"}`,
    `peerDependenciesMeta` wie oben. `main`, `module` und `exports` sind
    byte-gleich — das belegt, dass der entfernte Präfix-Strip ein No-op war.
    Beide Diffs in den Report.

11. **Verify** (unten) vollständig laufen lassen.

## Verify

```sh
pnpm install --frozen-lockfile && pnpm verify && python3 -c "import sys, yaml; [yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/main.yml .github/dependabot.yml && pnpm nx run rainbow-line:publishNpmPkg --graph=stdout | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>{const deps=JSON.parse(s.slice(s.indexOf('{'))).tasks.dependencies['rainbow-line:publishNpmPkg'];console.log(deps);process.exit(deps.includes('offscreen-display:publishNpmPkg')?0:1);})"
```

`pnpm verify` = lint, typecheck, build, test, e2e. Baseline: nur `pnpm lint`
war rot (ausschließlich `audit.html`); nach diesem Paket ist alles grün. Die
YAML-Prüfung ist nur Syntax — der Workflow selbst läuft erst auf GitHub.

## Commit

```
publish packages in dependency order, run ci on pull requests, ship optional peer deps

- nx publishes a package only after the workspace packages it depends on
- publishNpmPkg.mjs reports a failed npm show or npm publish and exits
  with 1, and no longer logs a prefix of the auth token
- .npm-pkg/ holds exactly what gets published: the publish script no
  longer copies files into it, rainbow-line's buildPackage.mjs adds the
  changelog
- the workflow checks pull requests and publishes only on push to main,
  one run at a time and with npm provenance
- rainbow-line takes eventize and offscreen-display as optional peer
  dependencies, astro-rainbow-line takes astro as a peer dependency
- add repository fields, dependabot and an astro-rainbow-line changelog
- drop the unused .npmignore files, the no-op path prefix strip in
  makePackageJson.mjs and the generated TODO.md (now gitignored)
- biome skips the generated audit.html
```

## Für Zug 5 (Schnittstellen-Zeile im Plan)

`rainbow-line/package.json`: `@spearwolf/eventize` und
`@spearwolf/offscreen-display` stehen in `devDependencies` und als optionale
`peerDependencies` (Peer für offscreen-display `workspace:*`, beim Paketbau
aufgelöst) · e2e prüft `peerDependencies` statt `dependencies` ·
`publishNpmPkg` hängt von `^publishNpmPkg` ab · `.npm-pkg/` ist das
vollständige Veröffentlichungsverzeichnis (kein Nachkopieren im
Publish-Skript) · `packages/astro-rainbow-line/CHANGELOG.md` existiert.

## Abgleich (Zug 0, gegen `e57a13c`)

- **BUILD-002 — unverändert.** `nx.json:54-60` `publishNpmPkg.dependsOn` ist
  `["buildNpmPkg"]`; der Taskgraph bestätigt es
  (`rainbow-line:publishNpmPkg` → nur `rainbow-line:buildNpmPkg`).
  `scripts/publishNpmPkg.mjs:27` Callback-`exec`, `:54` `execSync` ohne
  `try`. `.github/workflows/main.yml:35-54` Job `publish` ohne `concurrency`,
  `permissions` und Provenance. Keines der drei Manifeste hat ein
  `repository`-Feld — ohne das lehnt npm Provenance ab, deshalb Schritt 6.
- **BUILD-003 — unverändert.** `packages/offscreen-display/.npmignore:1-20`
  (rollup, jest, eslint, prettier), `packages/rainbow-line/.npmignore:1-16`;
  `scripts/makePackageJson.mjs:28` und `:84-107` Präfix-Strip, Quell-Manifeste
  ohne `.npm-pkg/`-Präfix; `TODO.md:4` Stempel 2024-07-18;
  `scripts/publishNpmPkg.mjs:18` loggt `substring(0, 6)` des Tokens. Dazu
  zwei Stellen, die das Entfernen von `TODO.md` mitzieht: `README.md:40`
  (Link auf `TODO.md`) und `biome.json:17` (`!**/TODO.md`).
  `packages/astro-rainbow-line/.npmignore` ist **kein** Rest: das Paket
  veröffentlicht sein Verzeichnis direkt.
- **DX-002 — unverändert.** `.github/workflows/main.yml:3-5` nur `push` auf
  `main`.
- **DEP-001 — unverändert.** `packages/rainbow-line/package.json:50-53`
  `dependencies` mit eventize und `workspace:*` offscreen-display; die
  Quellen importieren genau diese beiden (`src/RainbowLineElement.js:1`,
  `src/RainbowLineWorkerDisplay.js:1-2`), signalize nur transitiv.
  `packages/astro-rainbow-line/package.json:18-20` astro nur als
  devDependency. Keine `.github/dependabot.yml`. Das e2e-Spec
  `e2e/tests/npm-packages.spec.js:49-54` liest
  `rainbowLine.dependencies[...]` und bricht mit dem Umbau — wird mitgezogen
  (Schritt 2.3).
- **Nebenbefund, aufgenommen:** `scripts/publishNpmPkg.mjs:49-76`
  `preparePackageRoot()` kopiert beim Publish `LICENSE` (Root), `CHANGELOG.md`
  und `README-pkg.md`/`README.md` in `.npm-pkg/`. `LICENSE` und `README.md`
  kopiert `buildPackage.mjs` dort schon (Root- und Paket-`LICENSE` sind
  byte-gleich, `README-pkg.md` gibt es nirgends); die einzige Wirkung ist,
  dass rainbow-line sein `CHANGELOG.md` erst beim Publish bekommt — `.npm-pkg/`
  weicht damit lokal und im e2e vom Veröffentlichten ab. Vorbestehend (Datei
  in `e57a13c` unverändert). Gleiche Ursache wie BUILD-003: Reste eines
  früheren Publish-Aufbaus neben der Whitelist in `buildPackage.mjs`. Daher
  in dieses Paket, nicht in die Queue.
- **Lint-Baseline:** `pnpm lint` meldet 24 Fehler, 141 Warnungen, 101 Infos,
  sämtlich in `audit.html` (der Plan-Kopf nannte 20; korrigiert).
- **Triage:** keine `Folgen:`-Zeilen (erstes Paket), »Offene Befunde« leer.

## Findings im Volltext

**BUILD-002 · medium · nx.json:54** (weitere Fundstellen:
`scripts/publishNpmPkg.mjs:27`, `.github/workflows/main.yml:36`) —
Publish-Reihenfolge absichern: `publishNpmPkg` ohne `^publishNpmPkg`-Abhängigkeit

`publishNpmPkg` hängt nur von `buildNpmPkg` ab, nicht von `^publishNpmPkg`;
mit `parallel: 8` startet nx die Publishes von `offscreen-display` und
`rainbow-line` gleichzeitig. Werden beide Versionen in einem Push gebumpt,
kann `rainbow-line@x` mit `"@spearwolf/offscreen-display": "^y"` vor
`offscreen-display@y` auf npm landen — wer in diesem Fenster installiert oder
die `./RainbowLineElement.js`-Quelle nutzt, bekommt `ETARGET`. Das
Publish-Skript selbst arbeitet mit einem Callback-`exec` und `process.exit()`
im Callback; ein Fehler von `npm publish` (execSync wirft) endet als
unhandled exception ohne Kontextmeldung. Der Workflow publiziert bei jedem
Push auf `main`, ohne Provenance und ohne `concurrency`-Gruppe — zwei
schnelle Pushes laufen parallel.

Empfehlung: In `nx.json` `"publishNpmPkg": {"dependsOn": ["buildNpmPkg",
"^publishNpmPkg"]}` setzen. Im Workflow `concurrency: {group: publish,
cancel-in-progress: false}` und `npm publish --provenance` (braucht
`permissions: id-token: write`). Im Skript `execSync` in `try`/`catch` mit
klarer Meldung und Exit-Code 1.

**BUILD-003 · low · packages/offscreen-display/.npmignore:1** (weitere
Fundstellen: `packages/rainbow-line/.npmignore:1`,
`scripts/makePackageJson.mjs:28`, `scripts/makePackageJson.mjs:103`,
`TODO.md:3`) — Tote Publish-Reste entfernen: `.npmignore`-Dateien und der
`.npm-pkg/`-Präfix-Strip

Publiziert wird aus `.npm-pkg/`, das `buildPackage.mjs` per Whitelist
befüllt. Die `.npmignore`-Dateien in `offscreen-display` und `rainbow-line`
mit Einträgen für eslint, prettier, jest und rollup sind damit wirkungslos
und stammen aus einem früheren Setup; sie suggerieren einen
Filtermechanismus, den es nicht mehr gibt. In `makePackageJson.mjs` entfernt
`removeDistPathPrefix` den Präfix `.npm-pkg/` aus `main`/`module`/`exports` —
die Quell-`package.json` enthalten diesen Präfix nirgends, der Schritt ist
ein No-op. `TODO.md` trägt den Generierungsstempel 2024-07-18 und wird nicht
in `verify` regeneriert. Sicherheitsaspekt: Das Publish-Skript loggt die
ersten sechs Zeichen von `NODE_AUTH_TOKEN`; GitHub maskiert nur das
vollständige Secret, der Prefix `npm_xx` landet im öffentlichen CI-Log.

Empfehlung: Beide `.npmignore` löschen, `removeDistPathPrefix` samt
`targetSubDir`-Präfix aus `makePackageJson.mjs` entfernen, das Token-Logging
auf `set`/`unset` reduzieren, `make:todo` in `verify` aufnehmen oder
`TODO.md` aus dem Repo nehmen. (Entschieden: aus dem Repo nehmen und
ignorieren, siehe »Entscheidungen« im Plan.)

**DX-002 · low · .github/workflows/main.yml:3** — CI auch für Pull Requests
laufen lassen

Der einzige Workflow triggert auf `push` nach `main`. Pull Requests werden
nicht geprüft, ein fehlerhafter Merge fällt erst nach dem Merge auf — und
weil der Publish-Job an `ci` hängt, blockiert er dann alle Releases, bis
`main` repariert ist. Für ein Ein-Personen-Projekt tolerierbar, für jeden
externen Beitrag nicht.

Empfehlung: `on: {push: {branches: [main]}, pull_request: {}}` setzen und
den `publish`-Job mit `if: github.event_name == 'push'` schützen.

**DEP-001 · low · packages/rainbow-line/package.json:50** (weitere
Fundstellen: `packages/astro-rainbow-line/package.json:18`,
`.github/workflows/main.yml:1`) — Laufzeit-Dependencies von `rainbow-line`
und `astro-rainbow-line` an das Geschippte anpassen

`pnpm outdated` meldet nur `@types/node` (24 → 26, passend zum Node-24-Pin,
also in Ordnung); Lockfile ohne Duplikate. `rainbow-line` deklariert
`@spearwolf/eventize` und `@spearwolf/offscreen-display` als
`dependencies`, obwohl `bundle.js`, `rainbow-line.js` und
`rainbow-line.worker.js` alles inlinieren — gebraucht werden sie nur für die
Quell-Subpfade `./RainbowLineElement.js` und `./RainbowLineWorkerDisplay.js`.
Jeder Konsument des Bundles installiert damit eventize und transitiv
signalize umsonst. `astro-rainbow-line` hat `astro` nur als devDependency und
keine `peerDependencies`, sodass kein Versionskorridor beim Konsumenten
geprüft wird. Es gibt weder Dependabot noch Renovate; die letzte
Aktualisierung vor der heutigen lag 21 Monate zurück.

Empfehlung: Entscheiden, ob die Quell-Subpfade Teil der öffentlichen API
bleiben; wenn ja, eventize/offscreen-display als `peerDependencies`
(optional) deklarieren, wenn nein, Subpfade und Dependencies streichen.
`astro` als `peerDependencies: {"astro": ">=5"}` eintragen. Eine
`.github/dependabot.yml` mit monatlichem Intervall für `npm` und
`github-actions` anlegen. (Entschieden: Subpfade bleiben, optionale Peers,
siehe »Entscheidungen« im Plan.)

## Verlauf

- 2026-09-22 Zug 0: Detailplan steht · BUILD-002, BUILD-003, DX-002, DEP-001
  unverändert an den genannten Fundstellen · Nebenbefund
  `scripts/publishNpmPkg.mjs:49-76` (`preparePackageRoot`) wegen gleicher
  Ursache wie BUILD-003 ins Paket · Lint-Baseline korrigiert auf 24 Fehler in
  `audit.html` · keine Folgen, »Offene Befunde« leer · Restplan: Paket 4
  vermerkt, dass die astro-`CHANGELOG.md` aus DX-001 hier entsteht
- 2026-09-22 Zug 1: Implementierer beauftragt (sonnet, effort medium), Report nach `$ARBEITSDIR/paket-1.impl-1.json`
- 2026-09-22 Zug 2: Report FERTIG · 17 Dateien geändert, 2 neu (`.github/dependabot.yml`, `packages/astro-rainbow-line/CHANGELOG.md`), 3 gelöscht (beide `.npmignore`, `TODO.md`) · Arbeitsbaum schmutzig · rote Läufe belegt (Taskgraph Exit 1, npm-packages.spec 4 rot) · Verify `$ARBEITSDIR/paket-1.verify.log` exit=0
- 2026-09-22 Zug 3: Reviewer (sonnet, effort medium) — freigeben, alle fünf erfüllt, 0 kritisch, 0 wichtig, 2 klein · Diff `$ARBEITSDIR/paket-1.diff` (gegen HEAD, 22 Dateien) · Report `$ARBEITSDIR/paket-1.review-1.json`
- 2026-09-22 Zug 4: entfällt, keine auslösenden Befunde
- 2026-09-22 Zug 5: Commit cdafb38 (erster Anlauf `29c7b71` enthielt nur die drei Löschungen, weil `git add` an `TODO.md` abbrach; per `--amend` vervollständigt, Commit-Inhalt byte-gleich zum reviewten Diff) · Verify `$ARBEITSDIR/paket-1.verify.log` exit=0 auf demselben Baum

## Urteil des Reviewers

- BUILD-002 — behoben: `nx.json:54` `dependsOn: ["buildNpmPkg", "^publishNpmPkg"]` (Taskgraph im Verify-Log); `scripts/publishNpmPkg.mjs:35-48` `fetchPublishedVersions` mit try/catch, `:50-57` `publishPackage` mit try/catch und Exit 1; `.github/workflows/main.yml:44-49` `permissions`/`concurrency`, `:66` `NPM_CONFIG_PROVENANCE`; `repository` in allen drei Manifesten.
- BUILD-003 — behoben: beide `.npmignore` gelöscht; `scripts/makePackageJson.mjs` ohne `removeDistPathPrefix`/`removePathPrefixAt`; Token-Log `set`/`unset` (`scripts/publishNpmPkg.mjs:15`); `TODO.md` entfernt, `.gitignore:22` `/TODO.md`, `biome.json` ohne `!**/TODO.md`, `README.md:38` angepasst.
- DX-002 — behoben: `.github/workflows/main.yml:3-6` `pull_request: {}`, Publish-Job mit `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` (`:42`).
- DEP-001 — behoben: `packages/rainbow-line/package.json:57-68` `peerDependencies`/`peerDependenciesMeta`; `packages/astro-rainbow-line/package.json` `peerDependencies: {"astro": ">=5"}`; `.github/dependabot.yml` neu.
- Nebenbefund `preparePackageRoot()` — behoben: `scripts/publishNpmPkg.mjs` ohne `preparePackageRoot`/`copyFile`/`fileURLToPath`; `packages/rainbow-line/scripts/buildPackage.mjs:16` `CHANGELOG.md` in `COPY_FILES`.

Kleine Befunde (ohne Runde):
- `scripts/makePackageJson.mjs:5-14` — `targetSubDir`, `workspaceRoot`, `packageRoot` und ihre Log-Zeilen bleiben; laut Detailplan beabsichtigt, nur notiert.
- Commit-Message — Betreff »ship optional peer deps« knapp formuliert, kein Konventionsverstoß.

Offen, lokal nicht prüfbar: ob Dependabot mit pnpm 11 zurechtkommt und ob der Workflow samt Provenance auf GitHub durchläuft — beides zeigt erst der nächste Push/PR.
