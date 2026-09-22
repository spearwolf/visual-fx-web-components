import {defineConfig} from 'vitest/config';
import {browserTestConfig} from '../../vitest.shared.mjs';

export default defineConfig({
  test: {
    ...browserTestConfig,
    name: 'rainbow-line',
  },
});
