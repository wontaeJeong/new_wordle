import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

const sourceFiles = ['src/**/*.{ts,tsx}'];
const e2eFiles = ['e2e/**/*.ts'];
const nodeConfigFiles = ['vite.config.ts', 'playwright.config.ts', 'capacitor.config.ts'];

const recommendedConfigsFor = (files) => [
  { ...js.configs.recommended, files },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files })),
];

export default [
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'android', 'ios'] },
  ...recommendedConfigsFor(sourceFiles),
  {
    files: sourceFiles,
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  ...recommendedConfigsFor(e2eFiles),
  {
    files: e2eFiles,
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.e2e.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...recommendedConfigsFor(nodeConfigFiles),
  {
    files: nodeConfigFiles,
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
