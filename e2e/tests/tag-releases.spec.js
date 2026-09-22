import {execFileSync, spawnSync} from 'node:child_process';
import {chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect, test} from '@playwright/test';

const scriptPath = fileURLToPath(new URL('../../scripts/tagReleases.mjs', import.meta.url));

// isolates every git call from the machine's configuration: without this, commit.gpgSign or tag.gpgSign of the
// developer running the suite would turn `git tag` into a signed, annotated tag, or a missing identity would fail
// the setup commits
const GIT_ISOLATION_ENV = {GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1'};

const COMMIT_ENV = {
  ...GIT_ISOLATION_ENV,
  GIT_AUTHOR_NAME: 'tag-releases test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'tag-releases test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
};

// how npm 12 answers a version that does not exist yet of a package that does, measured against the registry: the
// same E404 it gives for a package that does not exist at all
const E404_RESPONSE = {stderr: 'npm error code E404\nnpm error 404 No match found for version 1.0.0\n', status: 1};

const NPM_STUB_SOURCE = `
import {appendFileSync, existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const responsesPath = join(dir, 'npm-responses.json');
const callsLogPath = join(dir, 'npm-calls.log');

const argsLine = process.argv.slice(2).join(' ');
const priorCalls = existsSync(callsLogPath) ? readFileSync(callsLogPath, 'utf8').split('\\n').filter(Boolean) : [];
const priorCallsForSpec = priorCalls.filter((line) => line === argsLine).length;
appendFileSync(callsLogPath, argsLine + '\\n');

const spec = process.argv[3];
const responses = existsSync(responsesPath) ? JSON.parse(readFileSync(responsesPath, 'utf8')) : {};
const specResponses = responses[spec];

if (!specResponses) {
  process.stderr.write(\`npm-stub: no response for \${spec}\\n\`);
  process.exit(1);
}

const response = specResponses[Math.min(priorCallsForSpec, specResponses.length - 1)];
if (response.stdout) process.stdout.write(response.stdout);
if (response.stderr) process.stderr.write(response.stderr);
process.exit(response.status ?? 0);
`;

/**
 * A throwaway repository with a single publishable package `@example/alpha`, two commits and a bare `origin`.
 * @param {{version: string}} pkg
 * @returns {{tmp: string, work: string, origin: string, firstCommit: string, secondCommit: string}}
 */
function makeRepo(pkg) {
  const tmp = mkdtempSync(join(tmpdir(), 'tag-releases-'));
  const origin = join(tmp, 'origin.git');
  const work = join(tmp, 'work');

  execFileSync('git', ['init', '--bare', '--quiet', origin], {env: {...process.env, ...GIT_ISOLATION_ENV}});
  execFileSync('git', ['init', '--quiet', work], {env: {...process.env, ...GIT_ISOLATION_ENV}});

  mkdirSync(join(work, 'packages', 'alpha'), {recursive: true});
  writeFileSync(
    join(work, 'packages', 'alpha', 'package.json'),
    JSON.stringify({name: '@example/alpha', version: pkg.version, scripts: {publishNpmPkg: 'true'}}, null, 2),
  );

  execFileSync('git', ['add', '-A'], {cwd: work, env: {...process.env, ...GIT_ISOLATION_ENV}});
  execFileSync('git', ['commit', '--quiet', '-m', 'first'], {cwd: work, env: {...process.env, ...COMMIT_ENV}});
  const firstCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: work,
    encoding: 'utf8',
    env: {...process.env, ...GIT_ISOLATION_ENV},
  }).trim();

  writeFileSync(join(work, 'CHANGES'), 'second\n');
  execFileSync('git', ['add', '-A'], {cwd: work, env: {...process.env, ...GIT_ISOLATION_ENV}});
  execFileSync('git', ['commit', '--quiet', '-m', 'second'], {cwd: work, env: {...process.env, ...COMMIT_ENV}});
  const secondCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: work,
    encoding: 'utf8',
    env: {...process.env, ...GIT_ISOLATION_ENV},
  }).trim();

  execFileSync('git', ['remote', 'add', 'origin', origin], {cwd: work, env: {...process.env, ...GIT_ISOLATION_ENV}});

  return {tmp, work, origin, firstCommit, secondCommit};
}

/**
 * @param {string} tmp
 */
function installNpmStub(tmp) {
  const bin = join(tmp, 'bin');
  mkdirSync(bin);
  const npmStubPath = join(tmp, 'npm-stub.mjs');
  writeFileSync(npmStubPath, NPM_STUB_SOURCE);
  const npmWrapperPath = join(bin, 'npm');
  writeFileSync(npmWrapperPath, `#!/bin/sh\nexec '${process.execPath}' '${npmStubPath}' "$@"\n`);
  chmodSync(npmWrapperPath, 0o755);
  return bin;
}

/**
 * @param {string} tmp
 * @param {Record<string, Array<{stdout?: string, stderr?: string, status?: number}>>} responses
 */
function writeNpmResponses(tmp, responses) {
  writeFileSync(join(tmp, 'npm-responses.json'), JSON.stringify(responses));
}

/**
 * @param {{tmp: string, work: string}} repo
 * @param {Record<string, string>} [env]
 */
function runTagReleases(repo, env = {}) {
  const bin = installNpmStub(repo.tmp);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repo.work,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      TAG_RELEASES_RETRY_DELAYS: '0,0',
      ...env,
    },
  });
  return {status: result.status, stdout: result.stdout, stderr: result.stderr};
}

/**
 * @param {{tmp: string}} repo
 * @returns {string[]}
 */
function npmCalls(repo) {
  const logPath = join(repo.tmp, 'npm-calls.log');
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
}

/**
 * @param {{origin: string}} repo
 * @returns {string[]}
 */
function originTags(repo) {
  const output = execFileSync('git', ['--git-dir', repo.origin, 'tag', '--list'], {
    encoding: 'utf8',
    env: {...process.env, ...GIT_ISOLATION_ENV},
  });
  return output.split('\n').filter(Boolean);
}

test('tags a released version at the commit npm recorded, once the registry lists it', () => {
  const repo = makeRepo({version: '1.0.0'});
  try {
    writeNpmResponses(repo.tmp, {
      '@example/alpha@1.0.0': [E404_RESPONSE, E404_RESPONSE, {stdout: `${repo.firstCommit}\n`}],
    });

    const result = runTagReleases(repo, {TAG_RELEASES_RETRY_DELAYS: '0,0,0'});

    expect(result.status).toBe(0);
    expect(
      execFileSync('git', ['--git-dir', repo.origin, 'rev-parse', 'refs/tags/alpha-v1.0.0'], {
        encoding: 'utf8',
        env: {...process.env, ...GIT_ISOLATION_ENV},
      }).trim(),
    ).toBe(repo.firstCommit);
    expect(npmCalls(repo)).toEqual([
      'view @example/alpha@1.0.0 gitHead',
      'view @example/alpha@1.0.0 gitHead',
      'view @example/alpha@1.0.0 gitHead',
    ]);
  } finally {
    rmSync(repo.tmp, {recursive: true, force: true});
  }
});

test('ends red when the registry still does not list the version after the last retry', () => {
  const repo = makeRepo({version: '1.0.0'});
  try {
    writeNpmResponses(repo.tmp, {'@example/alpha@1.0.0': [E404_RESPONSE]});

    const result = runTagReleases(repo, {TAG_RELEASES_RETRY_DELAYS: '0,0'});

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('should already be published');
    expect(npmCalls(repo)).toHaveLength(3);
    expect(originTags(repo)).toEqual([]);
  } finally {
    rmSync(repo.tmp, {recursive: true, force: true});
  }
});

test('skips a dev version without asking npm', () => {
  const repo = makeRepo({version: '1.1.0-dev'});
  try {
    writeNpmResponses(repo.tmp, {});

    const result = runTagReleases(repo);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('is a dev version, nothing to tag');
    expect(npmCalls(repo)).toEqual([]);
    expect(originTags(repo)).toEqual([]);
  } finally {
    rmSync(repo.tmp, {recursive: true, force: true});
  }
});

const GIT_HEAD_CASES = [
  {
    label: 'missing',
    gitHead: '',
    message: 'npm records no gitHead for it; set the tag alpha-v1.0.0 by hand',
  },
  {
    label: 'not a commit id',
    gitHead: 'not-a-commit',
    message: "its recorded gitHead 'not-a-commit' is not a commit id; set the tag alpha-v1.0.0 by hand",
  },
  {
    label: 'not in the checkout',
    gitHead: '0123456789abcdef0123456789abcdef01234567',
    message: 'is not in this checkout; set the tag alpha-v1.0.0 by hand',
  },
];

for (const {label, gitHead, message} of GIT_HEAD_CASES) {
  test(`ends red and names the tag to set by hand when the recorded gitHead is ${label}`, () => {
    const repo = makeRepo({version: '1.0.0'});
    try {
      writeNpmResponses(repo.tmp, {'@example/alpha@1.0.0': [{stdout: `${gitHead}\n`}]});

      const result = runTagReleases(repo);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(message);
      expect(originTags(repo)).toEqual([]);
      expect(
        execFileSync('git', ['-C', repo.work, 'tag', '--list'], {
          encoding: 'utf8',
          env: {...process.env, ...GIT_ISOLATION_ENV},
        }).trim(),
      ).toBe('');
    } finally {
      rmSync(repo.tmp, {recursive: true, force: true});
    }
  });
}

for (const value of ['soon', '10,,20']) {
  test(`refuses a TAG_RELEASES_RETRY_DELAYS of '${value}'`, () => {
    const repo = makeRepo({version: '1.0.0'});
    try {
      writeNpmResponses(repo.tmp, {});

      const result = runTagReleases(repo, {TAG_RELEASES_RETRY_DELAYS: value});

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('TAG_RELEASES_RETRY_DELAYS must be a comma-separated list of seconds');
      expect(npmCalls(repo)).toEqual([]);
    } finally {
      rmSync(repo.tmp, {recursive: true, force: true});
    }
  });
}
