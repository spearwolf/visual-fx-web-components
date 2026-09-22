import {fixupPluginRules} from '@eslint/compat';
import js from '@eslint/js';
import {defineConfig, globalIgnores} from 'eslint/config';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import {createRequire} from 'node:module';

// eslint-plugin-require-extensions only ships a CommonJS export and still calls context.getFilename(),
// which ESLint 10 removed, so it needs both createRequire and the compat shim
const requireExtensions = fixupPluginRules(createRequire(import.meta.url)('eslint-plugin-require-extensions'));

export default defineConfig([
  globalIgnores([
    '**/node_modules',
    '**/build',
    '**/dist',
    '**/lib',
    '**/coverage',
    '**/tests',
    '**/.npm-pkg',
    'packages/rainbow-line/bundle.js',
    'packages/rainbow-line/rainbow-line.js',
    'packages/rainbow-line/rainbow-line.worker.js',
    'packages/astro-rainbow-line/rainbow-line-v*.js',
  ]),
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    plugins: {'require-extensions': requireExtensions},
    languageOptions: {
      globals: {...globals.browser, ...globals.worker},
    },
    rules: {
      ...requireExtensions.configs.recommended.rules,
      'no-unused-vars': ['error', {vars: 'all', args: 'after-used', argsIgnorePattern: '^_'}],
    },
  },
  {
    files: ['**/scripts/**/*.mjs'],
    languageOptions: {globals: globals.node},
  },
  astro.configs.recommended,
  prettierRecommended,
]);
