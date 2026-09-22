export function makeVersionWithBuild(build = 'vanilla') {
  const today = new Date();
  const month = String(today.getUTCMonth() + 1).padStart(2, '0');
  const date = String(today.getUTCDate()).padStart(2, '0');
  return (version) => `${version}+${build}.${today.getUTCFullYear()}${month}${date}`;
}
