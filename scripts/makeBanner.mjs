import fs from 'node:fs';
import path from 'node:path';
import {banner} from './makeBanner/banner.mjs';
import {makeVersionWithBuild} from './makeBanner/makeVersionWithBuild.mjs';

/**
 * @param {string} projectDir the directory of the package.json
 * @param {string} [build] the build tag of the version
 */
export function makeBanner(projectDir, build) {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
  const version = makeVersionWithBuild(build)(packageJson.version);
  return banner({...packageJson, version});
}
