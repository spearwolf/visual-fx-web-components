# Paket 1 — Release-Pipeline: Trusted Publishing, CI-Tags, Changelog- und Skript-Hygiene

Gehört zu `./remediation-plan.md`. Dort stehen Marke, Hash und der Stand des
Laufs, hier die Einzelheiten dieses Pakets. Bei Widerspruch gilt der Plan.

- Findings: NEW-1 (high), BUILD-004 (info), BUILD-005 (info, gegenstandslos — siehe Abgleich), CONS-002 (info)
- Ziel: Ein Push auf `main` veröffentlicht die Pakete per OIDC ohne Token und hinterlässt Tags, auf die die Changelog-Links zeigen.
- Modell: mittlere Stufe
- Effort: low
- Reviewer: stärkste Stufe, Effort high — der Diff gibt einem Job ein schreibendes Token und reicht Werte aus der npm-Registry an `git` weiter
- Dateien: `.github/workflows/main.yml`, `scripts/publishNpmPkg.mjs`, `scripts/tagReleases.mjs` (neu), `CLAUDE.md`; aus dem Stash unverändert mit dabei: `packages/offscreen-display/CHANGELOG.md`, `packages/astro-rainbow-line/CHANGELOG.md`
- Nicht anfassen: `packages/rainbow-line/CHANGELOG.md` (seine Links folgen dem Schema schon), `scripts/makePackageJson.mjs` (BUILD-005 entfällt), `docs/remediation/20260922-remediation-report.md` (Archiv)

## Wiederaufnahme — was B vor Zug 1 tut

Das Paket wurde nach dem Review angehalten; der Nutzer hat entschieden, dass
ein eigener Job `tag` die Release-Tags setzt (Plan, »Entscheidungen«, beide
Einträge »Paket 1: …« vom 2026-09-22). Der verifizierte Stand von damals liegt
im Stash und wird weiterverwendet, umgebaut wird nur der Tag-Teil.

1. Stash über den Namen suchen, nicht über die Nummer, und anwenden:
   ```bash
   ref=$(git stash list --format='%gd %gs' | awk '/: remediation-paket-1-verifiziert-vor-tag-job$/ {print $1; exit}')
   git stash apply "$ref"
   ```
   Stand Zug 0: `stash@{0}`, Commit `d58dfe8`, Basis `fa94d7e` = `HEAD`, fünf Dateien (`.github/workflows/main.yml`, `CLAUDE.md`, beide Changelogs, `scripts/publishNpmPkg.mjs`), keine ungetrackten. Findet sich kein Stash dieses Namens oder gibt es Konflikte: `blocked` mit genau diesem Grund, nicht von Hand zusammenführen.
2. Danach beginnt die Fehlerkette neu bei Runde 1 mit dem »Vorgehen« unten. Billigster Weg: Resume des Implementierers aus `paket-1.impl-1.json` (sonnet, Effort low — Profil unverändert lassen) mit dem Auftrag, diese Datei ab »Vorgehen« neu zu lesen. Findet die CLI die Session nicht, frischer Prozess mit vollem Brief.
3. Reportdateien fortlaufend nummerieren, nichts überschreiben: vom Stand vor dem Umbau liegen `paket-1.impl-1.json`, `paket-1.review-1.json`, `paket-1.verify.log`, `paket-1.diff` im Arbeitsverzeichnis. Die Wiederaufnahme schreibt `paket-1.impl-2.json`, `paket-1.verify-2.log`, `paket-1.diff-2`, `paket-1.review-2.json` usw. `rounds` in der Rückgabe zählt jeden Implementierer-Prozess des Pakets, den vor der Blockade eingeschlossen — die Schleife prüft, dass es nicht mehr Implementierer-Reports als Runden gibt.
4. Nach dem Commit in Zug 5: `git stash drop "$ref"` (neu gesucht wie in Schritt 1); die Verlaufszeile nennt den Namen.

## Grenzen für den Implementierer

- **Niemals** `pnpm publishNpmPkg`, `pnpm run publishNpmPkg`, `pnpm nx … publishNpmPkg` oder `node scripts/publishNpmPkg.mjs` **ohne** `--dry-run` ausführen.
- `node scripts/tagReleases.mjs` im Projektverzeichnis **nur mit** `--dry-run`. Ohne `--dry-run` läuft es ausschließlich im Wegwerf-Clone des Verify-Blocks, dessen Push in ein Wegwerf-Bare-Repo umgebogen ist.
- Kein `git tag`, kein `git push`, kein `npm publish` von Hand im Projekt.
- Keine neuen Abhängigkeiten. Die einzige neue Datei ist `scripts/tagReleases.mjs`.
- Keine CHANGELOG-Einträge für die Release-Mechanik (Trusted Publishing, Tag-Job): sie ändert nichts, was ein Nutzer der Pakete sieht. Die Changelog-Änderungen aus dem Stash bleiben, wie sie sind.

## Vorgehen

Ausgangslage: der Stash ist angewendet (siehe oben). Er enthält bereits, was
bleibt: `NODE_AUTH_TOKEN` ist aus dem Workflow entfernt, `publishNpmPkg.mjs`
loggt `ACTIONS_ID_TOKEN_REQUEST_URL`, beide Changelogs haben ihre
`## Comparing changes`-Abschnitte, der astro-Eintrag über den strict-Typecheck
ist gestrichen, `CLAUDE.md` Z. 42 und Z. 71 sind neu gefasst. Umzubauen ist der
Tag-Teil: er wandert aus `publishNpmPkg.mjs` und dem Publish-Job in einen
eigenen Job mit eigenem Skript.

1. **`.github/workflows/main.yml`, Job `publish`** — die `permissions` des Jobs (Z. 44–48 im Stash-Stand) werden genau zu:
   ```yaml
       permissions:
         contents: read
         # npm trusted publishing and provenance both use the OIDC token of this job
         id-token: write
   ```
   Die Kommentarzeile über `contents` aus dem Stash (`# publishNpmPkg pushes a git tag …`) fällt weg. Alles andere am Job bleibt, wie es im Stash steht: `env:` des Schritts `Publish npm packages` enthält nur `NPM_CONFIG_PROVENANCE: 'true'`, `registry-url` bleibt, `actions/checkout@v7` ohne `with:`.

2. **`.github/workflows/main.yml`, neuer Job `tag`** — ans Dateiende, nach dem Job `publish`, mit einer Leerzeile davor, wörtlich (zwei Leerzeichen Einrückung wie `publish:`):
   ```yaml
     tag:
       name: tag releases
       needs: publish
       runs-on: ubuntu-latest
       permissions:
         # the only job that pushes; it installs no dependencies, so no package script runs while it holds this token
         contents: write
       concurrency:
         group: tag
         cancel-in-progress: false
       steps:
         - uses: actions/checkout@v7
           with:
             # all commits and tags: a release is tagged at the commit npm recorded for it, which may be an older one
             fetch-depth: 0

         - uses: actions/setup-node@v7
           with:
             node-version-file: .nvmrc

         - run: node scripts/tagReleases.mjs
           name: Tag released versions
   ```
   Kein `if:` (`needs: publish` überspringt den Job, wenn `publish` übersprungen wird oder scheitert), kein `pnpm/action-setup`, kein Install, kein Build. Die Workflow-weiten `permissions: contents: read` oben bleiben.

3. **`scripts/publishNpmPkg.mjs`** — der Tag-Teil aus dem Stash fliegt komplett raus:
   - die Zeile `tagRelease();` direkt unter `publishPackage();` löschen;
   - die Funktion `tagRelease` samt ihrem JSDoc-Block und der Leerzeile davor löschen; die Datei endet danach mit der schließenden `}` von `publishPackage` und einem Zeilenumbruch.
   - Bleiben (aus dem Stash): die zwei Zeilen an Z. 15–16, `// npm trusted publishing exchanges the OIDC token …` und `console.log(' - ACTIONS_ID_TOKEN_REQUEST_URL:', …)`.
   - Ergebnis: `git diff HEAD -- scripts/publishNpmPkg.mjs` zeigt nur noch diese eine Zeile, ersetzt durch jene zwei.

4. **`scripts/tagReleases.mjs`** — neue Datei, wörtlich:
   ```js
   import {execFileSync} from 'node:child_process';
   import fs from 'node:fs';
   import path from 'node:path';

   // Runs in the `tag` job of `.github/workflows/main.yml`, which installs no dependencies:
   // only node built-ins and the git and npm command line tools are available here.
   // Every command runs in the current directory, the root of the checkout.

   const DRY_RUN = process.argv.includes('--dry-run');

   const projectRoot = path.resolve(process.cwd());

   console.log('projectRoot:', projectRoot);
   console.log('dryRun:', DRY_RUN ? 'yes' : 'no');

   /** @type {string[]} */
   const newTags = [];
   let failed = false;

   for (const pkgJson of readPublishedPackages()) {
     const tag = `${pkgJson.name.replace(/^@[^/]+\//, '')}-v${pkgJson.version}`;
     const spec = `${pkgJson.name}@${pkgJson.version}`;

     if (tagExists(tag)) {
       console.log(tag, 'already exists');
       continue;
     }

     /** @type {string} */
     let commit;
     try {
       // the commit npm recorded when it published this version, which need not be the commit of this run
       commit = execFileSync('npm', ['view', spec, 'gitHead'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
     } catch (error) {
       if (error.stderr?.toString().includes('E404')) {
         console.log(spec, 'is not on npm, nothing to tag');
       } else {
         console.error(`npm view ${spec} gitHead failed:`, error.stderr?.toString() || error.message);
         failed = true;
       }
       continue;
     }

     // the value comes from the registry, so it has to look like a commit id before git sees it
     if (!/^[0-9a-f]{40}$/.test(commit) || !commitExists(commit)) {
       console.error(`${spec} is on npm, but its recorded commit '${commit}' is not in this checkout; set the tag ${tag} by hand`);
       failed = true;
       continue;
     }

     if (DRY_RUN) {
       console.log('dry run: would tag', tag, 'at', commit);
       continue;
     }

     try {
       // a lightweight tag, like the existing release tags, so the job needs no git identity
       execFileSync('git', ['tag', tag, commit], {stdio: 'inherit'});
       console.log('tagged', commit, 'as', tag);
       newTags.push(tag);
     } catch (error) {
       console.error(`git tag ${tag} ${commit} failed (exit code ${error.status ?? 'unknown'})`);
       failed = true;
     }
   }

   if (newTags.length > 0) {
     try {
       execFileSync('git', ['push', 'origin', ...newTags.map((tag) => `refs/tags/${tag}`)], {stdio: 'inherit'});
       console.log('pushed', newTags.join(' '));
     } catch (error) {
       console.error(`git push of ${newTags.join(' ')} failed (exit code ${error.status ?? 'unknown'})`);
       failed = true;
     }
   }

   if (failed) {
     process.exit(1);
   }

   /**
    * The `package.json` of every workspace package that `pnpm publishNpmPkg` publishes: those with a `publishNpmPkg` script.
    */
   function readPublishedPackages() {
     const packagesDir = path.resolve(projectRoot, 'packages');
     return fs
       .readdirSync(packagesDir)
       .sort()
       .map((dir) => path.resolve(packagesDir, dir, 'package.json'))
       .filter((pkgJsonPath) => fs.existsSync(pkgJsonPath))
       .map((pkgJsonPath) => JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')))
       .filter((pkgJson) => pkgJson.scripts?.publishNpmPkg);
   }

   /**
    * @param {string} tag
    */
   function tagExists(tag) {
     try {
       execFileSync('git', ['rev-parse', '--quiet', '--verify', `refs/tags/${tag}`], {stdio: 'ignore'});
       return true;
     } catch {
       return false;
     }
   }

   /**
    * @param {string} commit
    */
   function commitExists(commit) {
     try {
       execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], {stdio: 'ignore'});
       return true;
     } catch {
       return false;
     }
   }
   ```
   In Zug 0 erprobt (Kopie außerhalb des Projekts): `biome check --write` ändert nichts, `tsc` mit den Optionen aus `tsconfig.json` ist grün, der Clone-Test aus dem Verify-Block läuft durch. `pnpm typecheck` erfasst die Datei über `scripts/**/*.mjs`.

5. **`CLAUDE.md`** — im Stash-Stand:
   - Z. 63: die beiden Sätze, die der Stash angehängt hat (ab »After a successful publish it tags the commit …« bis »… set it by hand.«), wieder löschen. Die Zeile endet danach wie in `HEAD` mit »… skips versions already on npm and versions ending in `-dev`.«
   - Nach dem Absatz in Z. 65 (»nx publishes a package only after …«) einen neuen Absatz einfügen, mit Leerzeile davor und danach, wörtlich:
     »After a successful publish job, the job `tag` runs `scripts/tagReleases.mjs`: for every package with a `publishNpmPkg` script whose current version is on npm but has no tag `<name>-v<version>` yet (name unscoped, `offscreen-display-v0.3.0`), it sets a lightweight tag on the commit npm recorded as the `gitHead` of that version and pushes it. Only this job has `contents: write`, and it installs no dependencies, so no package script runs while it holds that token. A version the job misses (npm did not list it yet, or the push failed) gets its tag on the next run, as long as it is still the version in `package.json`. `node scripts/tagReleases.mjs --dry-run` prints what it would tag.«
   - Z. 42 und Z. 71 bleiben, wie der Stash sie gefasst hat.

6. **Changelogs** — nichts zu tun, der Stash-Stand bleibt.

Diff gegen `HEAD` danach, zur Kontrolle: `main.yml` (Kommentar über `id-token`, `NODE_AUTH_TOKEN` weg, Job `tag` neu), `publishNpmPkg.mjs` (eine Logzeile), `tagReleases.mjs` (neu), `CLAUDE.md` (Z. 42, neuer Absatz nach Z. 65, Z. 71), beide Changelogs. Nirgends `contents: write` außer im Job `tag`.

## Verify

Aus dem Repo-Root, als ein Block. Die Subshell hält die Schutz-Variablen aus
der aufrufenden Shell heraus; `GIT_CONFIG_*` biegt jeden `git push` auf ein
nicht existierendes Ziel um, `npm_config_dry_run` erzwingt den Probelauf von
`npm publish`. Für den Clone-Test zeigen die Push-URL im Clone und die
Umgebungsvariable beide auf ein Wegwerf-Bare-Repo — kein Weg führt zurück ins
Projekt.

```bash
( set -eo pipefail
  A=/tmp/claude-1000/-home-spw-spaceland-visual-fx-web-components/ffbbf9b0-069c-482f-bc17-882a0bf45c29/scratchpad
  REPO=$(pwd)
  pnpm verify
  # the workflow: publish without a token and without write access, tag as the only job that may push
  python3 - <<'EOF'
import yaml
text = open('.github/workflows/main.yml').read()
workflow = yaml.safe_load(text)
jobs = workflow['jobs']
assert 'NODE_AUTH_TOKEN' not in text and 'NPM_AUTH_TOKEN' not in text
assert workflow['permissions'] == {'contents': 'read'} and 'permissions' not in jobs['ci']
assert jobs['publish']['permissions'] == {'contents': 'read', 'id-token': 'write'}
assert jobs['publish']['steps'][-1]['env'] == {'NPM_CONFIG_PROVENANCE': 'true'}
assert jobs['tag']['needs'] == 'publish' and 'if' not in jobs['tag']
assert jobs['tag']['permissions'] == {'contents': 'write'}
assert jobs['tag']['steps'][0] == {'uses': 'actions/checkout@v7', 'with': {'fetch-depth': 0}}
assert not any('pnpm' in str(step) for step in jobs['tag']['steps'])
assert jobs['tag']['steps'][-1]['run'] == 'node scripts/tagReleases.mjs'
print('workflow ok')
EOF
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=remote.origin.pushurl GIT_CONFIG_VALUE_0=/nonexistent/push-blocked npm_config_dry_run=true
  # publishNpmPkg: no tagging left, still runs through
  test -z "$(grep -nE 'tagRelease|git (tag|push)' scripts/publishNpmPkg.mjs)"
  node scripts/publishNpmPkg.mjs packages/astro-rainbow-line --dry-run > "$A/paket-1.dry-run-astro-2.log" 2>&1
  grep -F ' - ACTIONS_ID_TOKEN_REQUEST_URL: unset' "$A/paket-1.dry-run-astro-2.log"
  grep -F '+ @spearwolf/astro-rainbow-line@1.4.0' "$A/paket-1.dry-run-astro-2.log"
  # tagReleases at HEAD: the current versions are not on npm yet
  node scripts/tagReleases.mjs --dry-run > "$A/paket-1.tag-dry-run-head.log" 2>&1
  grep -F '@spearwolf/astro-rainbow-line@1.4.0 is not on npm, nothing to tag' "$A/paket-1.tag-dry-run-head.log"
  grep -F '@spearwolf/offscreen-display@0.3.0 is not on npm, nothing to tag' "$A/paket-1.tag-dry-run-head.log"
  grep -F 'rainbow-line@0.5.0 is not on npm, nothing to tag' "$A/paket-1.tag-dry-run-head.log"
  # tagReleases for real, in a throwaway clone at b54bc7c (0.2.0 / 0.4.0 / 1.3.0, all published from 896de45)
  # that pushes into a throwaway bare repository; rainbow-line-v0.4.0 exists there beforehand
  rm -rf "$A/paket-1.tag-clone" "$A/paket-1.tag-remote.git"
  git clone -q "$REPO" "$A/paket-1.tag-clone"
  git init -q --bare "$A/paket-1.tag-remote.git"
  git -C "$A/paket-1.tag-clone" remote set-url --push origin "$A/paket-1.tag-remote.git"
  git -C "$A/paket-1.tag-clone" checkout -q --detach b54bc7c
  git -C "$A/paket-1.tag-clone" tag rainbow-line-v0.4.0 896de45
  (cd "$A/paket-1.tag-clone" && GIT_CONFIG_VALUE_0="$A/paket-1.tag-remote.git" node "$REPO/scripts/tagReleases.mjs" --dry-run) > "$A/paket-1.tag-clone-dry.log" 2>&1
  grep -F 'dry run: would tag offscreen-display-v0.2.0 at 896de45fd2a4c68aaf8f648d9aaca1ad63381b93' "$A/paket-1.tag-clone-dry.log"
  test -z "$(git -C "$A/paket-1.tag-remote.git" tag -l)"
  (cd "$A/paket-1.tag-clone" && GIT_CONFIG_VALUE_0="$A/paket-1.tag-remote.git" node "$REPO/scripts/tagReleases.mjs") > "$A/paket-1.tag-clone-run.log" 2>&1
  grep -F 'rainbow-line-v0.4.0 already exists' "$A/paket-1.tag-clone-run.log"
  test "$(git -C "$A/paket-1.tag-remote.git" rev-parse refs/tags/offscreen-display-v0.2.0)" = 896de45fd2a4c68aaf8f648d9aaca1ad63381b93
  test "$(git -C "$A/paket-1.tag-remote.git" rev-parse refs/tags/astro-rainbow-line-v1.3.0)" = 896de45fd2a4c68aaf8f648d9aaca1ad63381b93
  test -z "$(git -C "$A/paket-1.tag-remote.git" tag -l rainbow-line-v0.4.0)"
  (cd "$A/paket-1.tag-clone" && GIT_CONFIG_VALUE_0="$A/paket-1.tag-remote.git" node "$REPO/scripts/tagReleases.mjs") > "$A/paket-1.tag-clone-rerun.log" 2>&1
  test "$(grep -c 'already exists' "$A/paket-1.tag-clone-rerun.log")" = 3
  # nothing reached the project repository
  test -z "$(git tag -l 'offscreen-display-*' 'astro-rainbow-line-*' rainbow-line-v0.4.0 rainbow-line-v0.5.0)"
)
```

- Netz nötig: `npm show`/`npm view` fragen die Registry. Die Grep-Zeilen zu HEAD gelten nur, solange 0.3.0 / 0.5.0 / 1.4.0 nicht auf npm sind (Stand 2026-09-22: npm hat 0.2.0 / 0.4.0 / 1.3.0). Der Clone-Test hängt nur an längst veröffentlichten Versionen und bleibt stabil.
- `b54bc7c` ist gewählt, weil der Commit keine Projekt-`.npmrc` mehr hat (die älteren tragen eine mit `${NPM_AUTH_TOKEN}`, an der `npm view` ohne die Variable scheitern kann) und seine drei Versionen alle von `896de45` veröffentlicht wurden — der Test beweist so, dass am `gitHead` getaggt wird und nicht am Checkout.
- In der Ausgabe von `git push` steht lokal eine Zeile »Everything up-to-date«; sie stammt aus der Git-Konfiguration des Nutzers und ist bedeutungslos.
- Vorbestehend (Plan, »Vorbestehende Fehler«): ein einzelner Firefox-Timeout in `e2e/tests/astro-rainbow-line.spec.js:38` oder `e2e/tests/rainbow-line.spec.js:59` blockiert nicht, wenn eine Wiederholung grün ist.

## Commit

`publish through npm trusted publishing, tag each release in a separate ci job, link the changelog comparisons of all packages, drop the astro-rainbow-line changelog entry for a bug no release had`

## Verlauf

- 2026-09-22 Zug 0: Detailplan steht · NEW-1 unverändert (`.github/workflows/main.yml:65`) · BUILD-004 verschoben auf `packages/rainbow-line/CHANGELOG.md:82–84`, sonst unverändert · BUILD-005 gegenstandslos (`scripts/makePackageJson.mjs:5–13,39,66`) · CONS-002 unverändert (`packages/astro-rainbow-line/CHANGELOG.md:23`) · keine Folgen (erstes Paket), »Offene Befunde« leer · Restplan unverändert
- 2026-09-22 Zug 1: Implementierer beauftragt, sonnet (mittlere Stufe), Effort low · Report nach paket-1.impl-1.json
- 2026-09-22 Zug 2: Report FERTIG · Dateien: .github/workflows/main.yml, scripts/publishNpmPkg.mjs, packages/astro-rainbow-line/CHANGELOG.md, packages/offscreen-display/CHANGELOG.md, CLAUDE.md · Arbeitsbaum schmutzig · Verify exit=0 (paket-1.verify.log)
- 2026-09-22 Zug 3: Reviewer (opus, medium) · NEW-1 behoben (Repo-Anteil), BUILD-004 behoben (Repo-Anteil), BUILD-005 gegenstandslos bestätigt, CONS-002 behoben · 0 kritisch, 1 wichtig, 3 klein · Diff paket-1.diff, Report paket-1.review-1.json
- 2026-09-22 Zug 4: keine Runde gestartet — der wichtige Befund widerspricht dem Detailplan (checkout ohne `with:`, `contents: write` am Job) und der Entscheidung »Publish-Job bekommt contents: write« · Rückgabe `question` · Arbeitsbaum bleibt schmutzig mit dem verifizierten Stand (Verify exit=0), nicht gestasht
- 2026-09-22 Orchestrator: Nutzerentscheidung eigener Job `tag` · Arbeitsbaum gesichert in Stash `remediation-paket-1-verifiziert-vor-tag-job` (d58dfe8, Basis fa94d7e)
- 2026-09-22 Zug 0 (Wiederaufnahme): Detailplan für Job `tag` und `scripts/tagReleases.mjs` steht · Stash gelesen, nicht angewendet, Basis = `HEAD` · NEW-1, BUILD-004, CONS-002 unverändert an denselben Fundstellen, BUILD-005 weiter gegenstandslos · Skript und Verify-Block außerhalb des Projekts gegen Wegwerf-Clone erprobt, grün · Offene Befunde: 1 Eintrag, bleibt in der Queue für Paket 2 · Restplan unverändert · Arbeitsbaum sauber (nur Plan und Paketdatei ungetrackt)
- 2026-09-22 Wiederaufnahme B: Stash `remediation-paket-1-verifiziert-vor-tag-job` (stash@{0}) angewendet, ohne Konflikte · Arbeitsbaum schmutzig (5 Dateien)
- 2026-09-22 Zug 1/Runde 1: Resume des Implementierers aus paket-1.impl-1.json (sonnet, Effort low) · Report nach paket-1.impl-2.json
- 2026-09-22 Zug 2: Report FERTIG · Dateien: .github/workflows/main.yml, scripts/publishNpmPkg.mjs, scripts/tagReleases.mjs (neu), CLAUDE.md, beide Changelogs aus dem Stash · Verify exit=0 (paket-1.verify-2.log)
- 2026-09-22 Zug 3: Reviewer (opus, high) · NEW-1 behoben, BUILD-004 behoben (Repo-Anteil), BUILD-005 gegenstandslos bestätigt, CONS-002 behoben · 0 kritisch, 1 wichtig (E404 nach Publish endet grün), 3 klein · Diff paket-1.diff-2, Report paket-1.review-2.json
- 2026-09-22 Zug 4 Runde 2 (erste nach Wiederaufnahme): wichtig E404 + klein -dev/Meldung → Resume Implementierer (sonnet, low) · Report nach paket-1.impl-3.json
  - zurück: FERTIG, tagReleases.mjs (Retry 5×/Backoff 10–40 s, -dev-Skip, drei Meldungen), CLAUDE.md-Satz · Verify exit=0 (paket-1.verify-3.log) · Diff paket-1.diff-3 · Nachprüfung Reviewer (opus, high) → paket-1.review-3.json
  - Nachprüfung: alle drei offenen Befunde erfüllt, 0 kritisch, 0 wichtig, 3 klein · Fortschritt, Kette endet
- 2026-09-22 Zug 5: Commit 6bfd485 · Verify exit=0 (paket-1.verify-3.log) · Stash `remediation-paket-1-verifiziert-vor-tag-job` gedroppt

## Abgleich

Stand 2026-09-22, Wiederaufnahme: `HEAD` ist weiter `fa94d7e`, dieselbe Basis wie beim ersten Zug 0 und wie der Stash. Alle Fundstellen neu nachgesehen.

- **NEW-1 — unverändert.** `.github/workflows/main.yml:65` reicht `NODE_AUTH_TOKEN: ${{ secrets.NPM_AUTH_TOKEN }}` an `pnpm run publishNpmPkg`, `scripts/publishNpmPkg.mjs:15` loggt die Variable. Run 35736078115 (Job »publish packages«, 2026-09-22 13:51): Node 24.20.0, npm 11.19.0; die Provenance-Signatur per OIDC gelingt, der `PUT` scheitert mit `E404`, begleitet von der npm-Notiz, dass Tokens mit 2FA-Bypass für direktes Publishing eingeschränkt werden. Das OIDC-Token des Jobs funktioniert also, das Token-Secret nicht mehr. Weg laut »Entscheidungen«: Trusted Publishing, Token raus. Im Stash erledigt, bleibt so.
- **BUILD-004 — verschoben, sonst unverändert.** Die Links stehen in `packages/rainbow-line/CHANGELOG.md:82–84` (Audit: 81–82) und verweisen auf `rainbow-line-v0.5.0` und `rainbow-line-v0.4.0`; lokal und auf `origin` existieren nur `rainbow-line-v0.2.0`, `-v0.2.1`, `-v0.3.0`. Die Empfehlung des Audits (Tags von Hand setzen) ist durch die Entscheidung »Release-Tags setzt CI« in der Fassung des Tag-Jobs ersetzt: `rainbow-line-v0.5.0` setzt der Job `tag` nach dem ersten erfolgreichen Publish, `rainbow-line-v0.4.0` der Nutzer einmalig (Commit belegt, siehe unten). Im Repo ändert sich für dieses Finding deshalb der Workflow samt neuem Skript, nicht der Changelog.
- **BUILD-005 — gegenstandslos (Fehlbefund).** Die Behauptung »ungenutzte Variablen« trifft auf keine der drei zu: `targetSubDir` (`scripts/makePackageJson.mjs:5`) bestimmt `packageRoot` (Z. 9); `packageRoot` ist das Zielverzeichnis, in das Z. 39–41 die veröffentlichte `package.json` schreibt; `workspaceRoot` (Z. 7) löst in `resolvePackageVersion` (Z. 66) die `package.json` der Geschwisterpakete auf. Die Log-Zeilen 11–13 geben genau die drei Pfade aus, mit denen das Skript arbeitet. Das Entfernen des Präfix-Strips in `cdafb38` hat nur `removeDistPathPrefix`/`removePathPrefixAt` gestrichen, deren einziger Nutzer `targetSubDir` als Präfix war; als Zielverzeichnis blieb die Variable in Gebrauch. Keine Änderung; der Abschluss schließt das Finding in der `audit.html` als Fehlbefund mit dieser Begründung.
- **CONS-002 — unverändert.** `packages/astro-rainbow-line/CHANGELOG.md:23`: »the component type-checks in projects with `strict` TypeScript settings« unter `### Fixed` von 1.4.0. 1.4.0 ist unveröffentlicht (npm: 1.3.0), die Entscheidung »Kein Versionssprung« nennt den Eintrag ausdrücklich. Im Stash erledigt, bleibt so.

## Triage

Kein Paket ist committet, also keine `Folgen:`-Zeilen. »Offene Befunde« hat einen Eintrag: `e2e/tests/rainbow-line.spec.js:59`, Firefox-Timeout unter Parallellast. Ursache ist die Last aus Vitest-Browser und Playwright, dieselbe wie NEW-2 in Paket 2, nicht die Release-Pipeline — er bleibt in der Queue mit seinem Urteil `→ Scope` und wird im Zug 0 von Paket 2 übernommen.

Die drei kleinen Befunde des Reviewers aus Zug 3 (unten) sind keine Folgen im Sinn des Plans — das Paket ist nicht committet —, sondern Anmerkungen zum verworfenen Tag-Teil; zwei davon erledigt der Umbau.

## Restplan

Paket 2 bleibt, wie es ist. Beide Pakete ändern `packages/*/CHANGELOG.md`, aber an getrennten Stellen: Paket 1 hängt `## Comparing changes` ans Dateiende und löscht eine Zeile im astro-Abschnitt 1.4.0, Paket 2 schreibt in die Versionsabschnitte 0.3.0 / 0.5.0. Der Umbau auf den Tag-Job berührt nur Workflow, Skripte und `CLAUDE.md` — nichts davon liegt in Paket 2. Keine Abhängigkeit, keine Umsortierung.

## Entscheidungen in Zug 0

Allein getroffen, je mit Grund. Aus dem ersten Zug 0, weiter gültig:

- **BUILD-005 gestrichen** — Fehlbefund, Begründung im Abgleich.
- **`registry-url` und `NPM_CONFIG_PROVENANCE` bleiben im Publish-Job.** npm zeigt Trusted Publishing mit genau dieser `setup-node`-Konfiguration; der OIDC-Tausch von npm ersetzt den Platzhalter-Token, den `setup-node` setzt. Provenance entsteht unter Trusted Publishing ohnehin, die Variable ist redundant, aber harmlos und hält den Diff klein.
- **Kein npm-Update im Workflow** — npm 11.19.0 im Runner, Mindestversion für Trusted Publishing 11.5.1.
- **Lightweight-Tags** — wie die drei vorhandenen Release-Tags; ein annotierter Tag bräuchte eine Git-Identität im Runner.
- **Links für alle Pakete** — jedes Paket bekommt `## Comparing changes` im Format von rainbow-line. Die Liste endet vor dem jeweils ältesten Abschnitt (offscreen-display 0.1.2, astro-rainbow-line 1.3.0): dessen Link bräuchte den Tag einer Version, die im Changelog nicht vorkommt. Alle verlinkten Tags sind über `gitHead` auf npm einem Commit zugeordnet.
- **Logzeile für den OIDC-Endpunkt statt für `NODE_AUTH_TOKEN`** — `setup-node` setzt `NODE_AUTH_TOKEN` stets auf einen Platzhalter, die alte Zeile meldete damit immer »set«.

Ersetzt durch den Tag-Job: »`tagRelease()` in `publishNpmPkg.mjs`« und »Tag-Fehler lässt den Publish-Job scheitern«.

Neu in der Wiederaufnahme:

- **Eigenes Skript `scripts/tagReleases.mjs` statt Shell im Workflow.** `pnpm typecheck` und Biome prüfen es, es läuft lokal mit `--dry-run` und lässt sich im Wegwerf-Clone vollständig testen; Shell in einer YAML-Zeile prüft niemand vor dem ersten roten Lauf auf `main`.
- **Getaggt wird der Commit, den npm als `gitHead` der Version führt, nicht der Commit des Laufs.** Fällt der Job einmal aus (Push rot, npm listet die frische Version noch nicht), setzt der nächste Lauf den Tag trotzdem am richtigen Commit. Dafür braucht der Checkout die ganze Historie — `fetch-depth: 0` steht schon in der Entscheidung. Belegt: npm führt `gitHead` für alle bisherigen Versionen (offscreen-display 0.1.2 → `142bff6`, 0.2.0 → `896de45`; rainbow-line 0.3.0 → `c0d51a3` = vorhandener Tag `rainbow-line-v0.3.0`, 0.4.0 → `896de45`; astro-rainbow-line 1.2.0 → `7cd6995`, 1.3.0 → `896de45`).
- **Registry-Werte gehen nie durch eine Shell.** Alle Kommandos laufen über `execFileSync` mit Argumentliste, `gitHead` muss `^[0-9a-f]{40}$` erfüllen und im Checkout existieren, bevor `git tag` ihn sieht — der Job hält ein schreibendes Token.
- **Paketauswahl: jedes `packages/*/package.json` mit Script `publishNpmPkg`.** Genau diese Projekte veröffentlicht `nx run-many -t publishNpmPkg`; ein neues Paket braucht keinen Eintrag im Skript.
- **Nur die aktuelle Version je Paket**, wie die Entscheidung es sagt. Ältere Versionen ohne Tag sind Nutzeraktion (Abschlussreport, Punkt 3).
- **Ein vorhandener Tag wird nie angefasst**, auch wenn er auf einen anderen Commit zeigt: kein Verschieben, kein Force-Push.
- **Fehler bei einem Paket halten die anderen nicht auf.** Die übrigen werden getaggt und in einem Push übertragen, danach endet der Job mit exit 1.
- **Kein `if:` am Job `tag`.** `needs: publish` überspringt ihn, wenn `publish` übersprungen wird (Pull Requests) oder scheitert; der nächste erfolgreiche Lauf holt die Tags nach.
- **`concurrency: group: tag`** wie beim Publish-Job — zwei Tag-Jobs, die gleichzeitig denselben Tag pushen, ließen den zweiten rot enden.
- **`actions/setup-node` mit `.nvmrc` im Tag-Job, ohne `registry-url`.** Dieselbe npm-Version wie im Publish-Job hält das Ausgabeformat von `npm view` fest; Lesen aus der Registry braucht keine Anmeldung.
- **Checkout im Tag-Job mit dem Default `persist-credentials: true`.** Der Job führt außer Checkout, `setup-node`, `git` und `npm view` nichts aus — kein Install, kein Build, kein Package-Script. Das war der Kern der Rückfrage des Reviewers.
- **Die Repo-Einstellungen tragen den Job** (per `gh api` gelesen): keine Rulesets, `default_workflow_permissions: read` — die Job-Permission `contents: write` hebt das für diesen einen Job an.
- **Reviewer eine Effort-Stufe höher als beim ersten Durchgang (high statt medium)** — der Diff gibt einem Job das schreibende Token und reicht Registry-Daten an `git` weiter.

## Für den Abschlussreport

Nutzeraktionen, die der Lauf nicht ausführt (Runner haben keine Rechte für `git tag`, `git push`, npm):

1. **Trusted Publisher eintragen**, je Paket auf npmjs.com → Package → Settings → Trusted publishing → GitHub Actions: Organization or user `spearwolf`, Repository `visual-fx-web-components`, Workflow filename `main.yml`, Environment leer. Für `@spearwolf/offscreen-display`, `rainbow-line`, `@spearwolf/astro-rainbow-line`. Ohne diesen Eintrag scheitert der Publish-Job weiter mit `E404`.
2. **Erst nach dem letzten Paket des Laufs pushen.** Der erste Push auf `main` nach Schritt 1 veröffentlicht 0.3.0 / 0.5.0 / 1.4.0; die Änderungen von Paket 2 stehen in denselben Changelog-Abschnitten (»Kein Versionssprung«) und müssen mit hinaus. Danach setzt der Job `tag` `offscreen-display-v0.3.0`, `rainbow-line-v0.5.0` und `astro-rainbow-line-v1.4.0` selbst; von Hand gesetzte Tags dieser Namen überspringt er.
3. **Alt-Tags einmalig setzen** — Commits belegt über `npm view <paket>@<version> gitHead` und die `version` in der jeweiligen `package.json` des Commits:
   ```bash
   git tag offscreen-display-v0.1.2 142bff6
   git tag offscreen-display-v0.2.0 896de45
   git tag rainbow-line-v0.4.0 896de45
   git tag astro-rainbow-line-v1.3.0 896de45
   git push origin offscreen-display-v0.1.2 offscreen-display-v0.2.0 rainbow-line-v0.4.0 astro-rainbow-line-v1.3.0
   ```
4. **Nach dem ersten erfolgreichen OIDC-Publish** das Repo-Secret entfernen (`gh secret delete NPM_AUTH_TOKEN`) und auf npmjs.com je Paket unter Settings → Publishing access »Require two-factor authentication and disallow tokens« wählen — Empfehlung von npm, sobald Trusted Publishing trägt.
5. **Fehlt nach dem ersten Publish ein Tag** (Job `tag` rot, etwa weil npm die Version auch nach rund 100 s Wartezeit noch nicht listet): den Job `tag` im Workflow-Lauf auf GitHub neu starten. Er tagt am Commit, den npm verzeichnet hat, egal wann er läuft.

## Findings im Volltext

**NEW-1 · high · build · `.github/workflows/main.yml:53-66`, `scripts/publishNpmPkg.mjs`** — Publish-Job auf `main` scheitert
Der Publish-Job auf `main` scheitert mit `npm error 404 Not Found - PUT https://registry.npmjs.org/@spearwolf%2f…` (Run 35736078115). Die Checks sind grün, `NODE_AUTH_TOKEN` ist gesetzt, npm lehnt das Token ab. Folge: `@spearwolf/offscreen-display@0.3.0`, `rainbow-line@0.5.0` und `@spearwolf/astro-rainbow-line@1.4.0` sind nicht veröffentlicht (npm: 0.2.0 / 0.4.0 / 1.3.0).
Empfehlung (aus »Entscheidungen«): Publish per npm Trusted Publishing (OIDC): `NODE_AUTH_TOKEN` fliegt aus dem Workflow, `id-token: write` bleibt; das Eintragen des Trusted Publishers je Paket auf npmjs.com ist Nutzeraktion.

**BUILD-004 · info · build · `packages/rainbow-line/CHANGELOG.md:81`, `:82`** — Vergleichslinks im rainbow-line-Changelog zeigen auf nicht gesetzte Tags
Die Links für 0.4.0 und 0.5.0 vergleichen gegen die Tags `rainbow-line-v0.4.0` und `rainbow-line-v0.5.0`, die es im Repo nicht gibt; bis zum Tagging führen sie ins Leere. Kleinbefund des Reviewers ohne Nachrunde.
Empfehlung: `rainbow-line-v0.4.0` auf `896de45` und `rainbow-line-v0.5.0` auf den Release-Commit setzen und pushen.

**BUILD-005 · info · build · `scripts/makePackageJson.mjs:5`** — makePackageJson loggt Pfade, die das Skript nicht mehr braucht
`targetSubDir`, `workspaceRoot` und `packageRoot` samt ihrer `console.log`-Zeilen stehen weiter im Skript, obwohl nach dem Entfernen des Präfix-Strips nur noch `projectRoot` und das Zielverzeichnis gebraucht werden. Kleinbefund des Reviewers ohne Nachrunde, laut Detailplan bewusst stehen gelassen.
Empfehlung: Ungenutzte Variablen und ihre Log-Zeilen entfernen.

**CONS-002 · info · consistency · `packages/astro-rainbow-line/CHANGELOG.md:23`** — Changelog 1.4.0 nennt einen Fix für einen Fehler, den kein Release hatte
»Fixed: the component type-checks in projects with strict TypeScript settings« beschreibt einen Fehler, der erst im selben unveröffentlichten Abschnitt entstanden ist. Nach Keep a Changelog entbehrlich. Kleinbefund des Reviewers ohne Nachrunde.
Empfehlung: Den Eintrag streichen, solange 1.4.0 nicht veröffentlicht ist.

## Befund, der zur Wiederaufnahme führte (Zug 4, beantwortet)

Reviewer, wichtig: mit `contents: write` im Publish-Job und dem Default `persist-credentials: true` von `actions/checkout` lag ein schreibendes `GITHUB_TOKEN` während des ganzen Publish-Jobs in `.git/config`; Install-Scripts aus `pnpm install`, die Build-Kette und die Lifecycle-Scripts von `npm publish` hätten damit auf `main` pushen können. Beantwortet durch die Nutzerentscheidung im Plan (eigener Job `tag`); das »Vorgehen« oben setzt sie um.

## Kleine Befunde des Reviewers (Zug 3, vor dem Umbau)

- `scripts/publishNpmPkg.mjs` — ein fehlgeschlagener Tag beendete den Publish mit exit 1 und hielt über `^publishNpmPkg` die abhängigen Pakete auf. **Erledigt durch den Umbau:** `publishNpmPkg.mjs` taggt nicht mehr, der Job `tag` läuft erst nach allen Publishes.
- `scripts/publishNpmPkg.mjs` — der Checkout holte keine Tags, ein schon vorhandener Release-Tag hätte den Push abgewiesen. **Erledigt durch den Umbau:** `fetch-depth: 0` holt alle Tags, das Skript überspringt vorhandene.
- `packages/offscreen-display/CHANGELOG.md:57-61`, `packages/astro-rainbow-line/CHANGELOG.md:30-33` — die neuen Links zeigen bis zum ersten Publish und Nutzeraktion 3 ins Leere. Gedeckt durch »Für den Abschlussreport«, keine Änderung.

## Anmerkung zum Verify

Der Implementierer sah im ersten Lauf einen Firefox-Timeout in `e2e/tests/rainbow-line.spec.js:59` (nicht nur `astro-rainbow-line.spec.js:38`); Wiederholung grün. Steht als Nebenbefund in »Offene Befunde« des Plans.

## Urteil des Reviewers (Zug 3/4, nach der Wiederaufnahme, Commit 6bfd485)

- NEW-1 — behoben (Repo-Anteil): `.github/workflows/main.yml` Job `publish` ohne `NODE_AUTH_TOKEN`, `permissions` `contents: read` + `id-token: write`; `scripts/publishNpmPkg.mjs:15–16` loggt den OIDC-Endpunkt. Trusted Publisher eintragen bleibt Nutzeraktion.
- BUILD-004 — behoben (Repo-Anteil): Job `tag` + `scripts/tagReleases.mjs` setzen künftig die Tags, auf die `packages/rainbow-line/CHANGELOG.md:82–84` zeigt; `rainbow-line-v0.4.0` Nutzeraktion 3.
- BUILD-005 — gegenstandslos bestätigt (`scripts/makePackageJson.mjs` nicht im Diff, Begründung im Abgleich trägt).
- CONS-002 — behoben: Eintrag unter `### Fixed` 1.4.0 in `packages/astro-rainbow-line/CHANGELOG.md` entfernt.
- Runde nach Review 2 (wichtig: E404 nach Publish endete grün) erfüllt: `scripts/tagReleases.mjs` `fetchGitHead` wiederholt außerhalb `--dry-run` mit 10/20/30/40 s und endet rot; `-dev` wird übersprungen; getrennte Meldungen für fehlenden/ungültigen/unbekannten `gitHead`.

## Kleine Befunde des Reviewers (nach der Wiederaufnahme)

- `CLAUDE.md:67` — »ends red if that version still does not show up or the push fails« liest sich abschließend; rot endet der Job auch bei unbrauchbarem `gitHead`, anderem `npm view`-Fehler oder gescheitertem `git tag`.
- `scripts/tagReleases.mjs:100` — rund 100 s Wartezeit kann bei langsamem Registry-CDN zu kurz sein; Folge roter Job und Neustart, gedeckt durch Abschlussreport Punkt 5.
- Verify deckt E404-Backoff, `-dev`-Skip und die drei Fehlermeldungen nicht ab (nur gelesen); ein Negativtest mit `npm`-Shim im `PATH` im Wegwerf-Clone wäre möglich.
- Commit-Subject mit 190 Zeichen länger als üblich (bisher max. 137).
- Abschlussreport Punkt 5 war veraltet — in dieser Datei angepasst.
