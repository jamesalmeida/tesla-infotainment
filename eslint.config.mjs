import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const unusedVarsOptions = { argsIgnorePattern: '^_', varsIgnorePattern: '^_' };

export default defineConfig([
  {
    ignores: ['dist/', 'node_modules/'],
  },
  {
    files: ['**/*.{js,jsx,mjs,ts,tsx}'],
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
      'no-unused-vars': ['warn', unusedVarsOptions],
      // A few effects intentionally synchronize an external trigger or drive a
      // closing animation. Those are legitimate setState-in-effect uses, so
      // report them without failing the build.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    rules: {
      // The TypeScript rule replaces the core one (which recommended turns off).
      '@typescript-eslint/no-unused-vars': ['warn', unusedVarsOptions],
    },
  },
  {
    // Untyped CodePen game kept as-is under @ts-nocheck until it is replaced (issue #6).
    files: ['src/components/Apps/Arcade/Games/Outrun/Outrun.tsx'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      'prefer-const': 'off',
      'no-var': 'off',
    },
  },
  {
    files: ['vite.config.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/setupTests.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
  },
]);
