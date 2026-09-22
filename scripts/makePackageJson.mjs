import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const targetSubDir = process.argv[2] || '.npm-pkg';

const workspaceRoot = path.resolve(fileURLToPath(import.meta.url), '../../');
const projectRoot = path.resolve(process.cwd());
const packageRoot = path.resolve(process.cwd(), targetSubDir);

console.log('workspaceRoot:', workspaceRoot);
console.log('projectRoot:', projectRoot);
console.log('packageRoot:', packageRoot);
console.log('- - -');

const packageJsonPath = path.resolve(projectRoot, 'package.json');
const inPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const packageJsonOverridePath = path.resolve(projectRoot, 'package.override.json');
const packageJsonOverride = fs.existsSync(packageJsonOverridePath)
  ? JSON.parse(fs.readFileSync(packageJsonOverridePath, 'utf8'))
  : {};

const outPackageJson = {
  ...inPackageJson,
};

[[outPackageJson, ['main', 'module', 'types']], [outPackageJson.exports]].forEach(removeDistPathPrefix);

resolveDependencies(outPackageJson.dependencies);
resolveDependencies(outPackageJson.peerDependencies);

for (const [key, value] of Object.entries(packageJsonOverride)) {
  if (value == null) {
    delete outPackageJson[key];
  } else {
    outPackageJson[key] = value;
  }
}

const releasePackageJsonPath = path.resolve(packageRoot, 'package.json');
console.log('Write to', releasePackageJsonPath);
fs.writeFileSync(releasePackageJsonPath, JSON.stringify(outPackageJson, null, 2));

// --------------------------------------------------------------------------------------------

function resolveDependencies(dependenciesSection) {
  if (dependenciesSection) {
    Object.entries(dependenciesSection).forEach(([depName, version]) => {
      if (version.startsWith('workspace:') || version === '*') {
        const pkgVersion = resolvePackageVersion(depName);
        if (pkgVersion) {
          dependenciesSection[depName] = pkgVersion;
        }
      }
    });
  }
}

function resolvePackageVersion(pkgName) {
  const pkgNameWithoutScope = pkgName.replace(/^@[^/]+\//, '');
  const pkgJsonPath = path.resolve(workspaceRoot, `packages/${pkgNameWithoutScope}/package.json`);
  console.log('Check workspace package', pkgName, '->', pkgJsonPath);
  if (fs.existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const pkgVersion = `^${pkgJson.version.replace(/-dev$/, '')}`;
    console.log('Resolve package version', pkgName, '->', pkgVersion);
    return pkgVersion;
  } else {
    console.warn(
      'Oops.. workspace package not found:',
      pkgName,
      '->',
      pkgNameWithoutScope,
      'referenced from:',
      inPackageJson.name,
    );
  }
  return undefined;
}

// --------------------------------------------------------------------------------------------

function removeDistPathPrefix([section, keys]) {
  if (keys) {
    keys.forEach((key) => {
      removePathPrefixAt(section, key);
    });
  } else {
    const replaceAllPropValues = (obj) => {
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === 'string') {
          removePathPrefixAt(obj, key);
        } else if (typeof obj[key] === 'object') {
          replaceAllPropValues(obj[key]);
        }
      });
    };
    replaceAllPropValues(section);
  }
}

function removePathPrefixAt(section, key, prefix = `${targetSubDir}/`) {
  if (section[key]) {
    section[key] = section[key].replace(prefix, '');
  }
}
