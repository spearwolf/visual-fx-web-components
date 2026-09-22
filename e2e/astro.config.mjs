import {copyFileSync, mkdirSync, readdirSync} from 'node:fs';
import {defineConfig} from 'astro/config';

const astroRainbowLineDir = new URL('../packages/astro-rainbow-line/', import.meta.url);

// a consumer of @spearwolf/astro-rainbow-line has to host the vendored rainbow-line script itself
const hostVendoredRainbowLine = {
  name: 'host-vendored-rainbow-line',
  hooks: {
    'astro:build:done': ({dir}) => {
      const jsDir = new URL('js/', dir);
      mkdirSync(jsDir, {recursive: true});
      for (const file of readdirSync(astroRainbowLineDir).filter((name) => /^rainbow-line-v.+\.js$/.test(name))) {
        copyFileSync(new URL(file, astroRainbowLineDir), new URL(file, jsDir));
      }
    },
  },
};

export default defineConfig({
  outDir: 'dist/astro',
  base: '/astro/',
  integrations: [hostVendoredRainbowLine],
});
