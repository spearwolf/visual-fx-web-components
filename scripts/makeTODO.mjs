import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(process.cwd());
const globalPkgJson = JSON.parse(fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8'));

const PACKAGES = [
  {pkgDir: 'packages/vfx', srcDir: 'src', extension: '.js'},
  {pkgDir: 'packages/shadow-ents', srcDir: 'src', extension: '.ts'},
  {pkgDir: 'packages/offscreen-display', srcDir: 'src', extension: '.js'},
  {pkgDir: 'packages/rainbow-line', srcDir: 'src', extension: '.js'},
];

// --- build reports ----------------------------------------------------------------------

const REPORTS = [];

for (const {pkgDir, srcDir, extension} of PACKAGES) {
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve(projectRoot, pkgDir, 'package.json'), 'utf8'));
  const pkgTitle = makeTitle(pkgJson.name);
  const pkgLabel = makeID(pkgTitle);

  try {
    const reportOutput = execSync(`pnpm exec leasot ${pkgDir}/${srcDir}/**/*${extension} -r markdown --tags XXX -x`, {
      cwd: projectRoot,
    });

    REPORTS.push({title: pkgTitle, label: pkgLabel, report: reportOutput?.toString() ?? ''});
  } catch (err) {
    console.error(err);
  }
}

// --- make output ----------------------------------------------------------------------

let output = `
# ${globalPkgJson.name}

> _Generated by [scripts/makeTODO.mjs](scripts/makeTODO.mjs) at ${new Date().toISOString()}_

This file contains an overview of all TODO, FIXME or XXX comments extracted from the source files of the packages.

#### List of all packages
`;

for (const {title, label} of REPORTS) {
  output += `\n- [${title}](#${label})`;
}

output += `\n\n`;

for (const {title, report} of REPORTS) {
  output += `
## ${title}

${report}
`;
}

function makeTitle(name) {
  return name.replace('@spearwolf/', '');
}
function makeID(name) {
  return name.replace(/[/ ]/g, '-').toLowerCase();
}

if (process.argv.length > 2) {
  fs.writeFileSync(process.argv[process.argv.length - 1], output, 'utf8');
} else {
  console.log('projectRoot:', projectRoot);

  console.log('packageJson: ---');
  console.dir(globalPkgJson);

  console.log('output: ---');
  console.log(output);
}