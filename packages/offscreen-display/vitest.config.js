import {defineConfig} from 'vitest/config';
import {browserTestConfig} from '../../vitest.shared.mjs';

export default defineConfig({
  optimizeDeps: {
    include: ['@spearwolf/eventize', '@spearwolf/signalize'],
  },
  test: {
    ...browserTestConfig,
    name: 'offscreen-display',
  },
});
