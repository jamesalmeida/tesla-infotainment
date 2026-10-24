import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    ignores: ['build/', 'node_modules/'],
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // CRA treated unused variables as warnings rather than build failures.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // A few effects intentionally synchronize an external trigger or drive a
      // closing animation. Those are legitimate setState-in-effect uses, so
      // report them without failing the build.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['vite.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.test.{js,jsx}', 'src/setupTests.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
  },
]);
