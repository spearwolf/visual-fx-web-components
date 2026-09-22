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

  if (pkgJson.version.endsWith('-dev')) {
    console.log(spec, 'is a dev version, nothing to tag');
    continue;
  }

  const commit = fetchGitHead(spec);
  if (commit === undefined) {
    continue;
  }
  if (commit === null) {
    failed = true;
    continue;
  }

  if (!commit) {
    console.error(`${spec} is on npm, but npm records no gitHead for it; set the tag ${tag} by hand`);
    failed = true;
    continue;
  }

  // the value comes from the registry, so it has to look like a commit id before git sees it
  if (!/^[0-9a-f]{40}$/.test(commit)) {
    console.error(`${spec} is on npm, but its recorded gitHead '${commit}' is not a commit id; set the tag ${tag} by hand`);
    failed = true;
    continue;
  }

  if (!commitExists(commit)) {
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
 * Resolves the `gitHead` npm recorded for `spec`. Outside `--dry-run`, `needs: publish` guarantees the version is
 * already published, so an `E404` here almost always means the registry has not listed it yet; retries with backoff
 * before giving up. `--dry-run` makes a single attempt, since it also runs locally against arbitrary versions.
 * @param {string} spec
 * @returns {string | null | undefined} the commit id, `undefined` if `spec` is not on npm, `null` on failure
 */
function fetchGitHead(spec) {
  const retryDelaysMs = DRY_RUN ? [] : [10_000, 20_000, 30_000, 40_000];
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      return execFileSync('npm', ['view', spec, 'gitHead'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
    } catch (error) {
      if (!error.stderr?.toString().includes('E404')) {
        console.error(`npm view ${spec} gitHead failed:`, error.stderr?.toString() || error.message);
        return null;
      }
      if (attempt === retryDelaysMs.length) {
        if (DRY_RUN) {
          console.log(spec, 'is not on npm, nothing to tag');
          return undefined;
        }
        console.error(
          `${spec} should already be published (this job only runs after a successful publish), but npm still answers E404`,
        );
        return null;
      }
      const delayMs = retryDelaysMs[attempt];
      console.log(spec, 'is not on npm yet, retrying in', delayMs / 1000, 's');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }
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
