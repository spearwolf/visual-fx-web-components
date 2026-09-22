import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');

const projectRoot = path.resolve(process.cwd());
const packageRoot = path.resolve(projectRoot, process.argv[2]);
const pkgJson = JSON.parse(fs.readFileSync(path.resolve(packageRoot, 'package.json'), 'utf8'));

console.log('projectRoot:', projectRoot);
console.log('packageRoot:', packageRoot);
console.log('dryRun:', DRY_RUN ? 'yes' : 'no');
console.log('env: ---');
// npm trusted publishing exchanges the OIDC token of GitHub Actions, which needs `id-token: write`
console.log(' - ACTIONS_ID_TOKEN_REQUEST_URL:', process.env.ACTIONS_ID_TOKEN_REQUEST_URL ? 'set' : 'unset');
console.log('packageJson: ---');
console.dir(pkgJson);

if (pkgJson.version.endsWith('-dev')) {
  console.warn('skip publishing, version', pkgJson.version, 'is marked as a *development* version');
  process.exit(0);
}

const versions = fetchPublishedVersions(pkgJson.name);
console.log('already published versions: ---');
console.dir(versions);

if (versions.includes(pkgJson.version)) {
  console.warn('skip publishing, version', pkgJson.version, 'is already released');
  process.exit(0);
}

publishPackage();

/**
 * @param {string} name
 */
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

function publishPackage(dryRun = DRY_RUN) {
  try {
    execSync(`npm publish --access public${dryRun ? ' --dry-run' : ''}`, {cwd: packageRoot, stdio: 'inherit'});
  } catch (error) {
    console.error(`npm publish failed for ${pkgJson.name}@${pkgJson.version} (exit code ${error.status ?? 'unknown'})`);
    process.exit(1);
  }
}
