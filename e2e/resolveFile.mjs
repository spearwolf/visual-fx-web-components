import {statSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';

/**
 * Maps a decoded url path to a file in the directory of the first route whose prefix it starts with.
 * A directory resolves to its index.html; anything that does not exist is undefined.
 *
 * @param {Record<string, string>} routes url path prefix → directory
 * @param {string} urlPath
 * @returns {string | undefined}
 */
export function resolveFile(routes, urlPath) {
  for (const [prefix, dir] of Object.entries(routes)) {
    if (urlPath.startsWith(prefix)) {
      const root = resolve(dir);
      const file = join(root, urlPath.slice(prefix.length));
      // without the trailing separator, a sibling directory with the same name prefix (e.g. `root-neighbour` next to
      // `root`) would pass the check too
      if (file !== root && !file.startsWith(root + sep)) return undefined;
      try {
        const stat = statSync(file);
        return stat.isDirectory() ? join(file, 'index.html') : file;
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
