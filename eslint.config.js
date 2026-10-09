import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-server',
      'dist-live',
      'coverage',
      'playwright-report',
      'test-results',
      'data',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Safari/VoiceOver drops list semantics for unstyled lists; explicit role="list" restores it.
      'jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'] }],
    },
  },
  {
    files: ['*.config.ts', 'e2e/**/*.ts', 'e2e-server/**/*.ts', 'e2e-pages/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Backend: Node globals; it logs to stdout. It must never depend on browser-only services.
    files: ['server/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/mock/*', '@/services/createServices', '@/services/config'],
              message: 'The backend must not use frontend mock services or frontend config.',
            },
          ],
        },
      ],
    },
  },
  {
    // Demo/mock services stay isolated from production code paths, and the frontend never
    // bundles backend code (secrets, database).
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/mock/*', '**/services/mock/*', './mock/*', '../mock/*'],
              message: 'Mock/demo services may only be wired in src/services/createServices.ts.',
            },
            { group: ['**/server/**'], message: 'Frontend code must not import the backend.' },
          ],
        },
      ],
    },
    ignores: [
      'src/services/createServices.ts',
      'src/services/mock/**',
      'src/**/*.test.{ts,tsx}',
      'src/test/**',
    ],
  },
);
