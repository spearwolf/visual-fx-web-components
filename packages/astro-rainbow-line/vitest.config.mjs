import {getViteConfig} from 'astro/config';

// getViteConfig() adds the astro compiler, so the tests can import RainbowLine.astro directly
export default getViteConfig(
  {
    test: {
      name: 'astro-rainbow-line',
      include: ['test/**/*.test.js'],
      environment: 'node',
    },
  },
  {logLevel: 'error'},
);
