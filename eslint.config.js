import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results', 'coverage'] },

  // Base: all TS/TSX source.
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Stub functions accept their typed inputs before Phase 1 fills them in.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // ── Engine purity (HANDOFF §3) ────────────────────────────────────────────
  // src/engine/** is pure, dependency-free TypeScript. It must not reach into
  // React, the DOM, or any UI layer (features/ components/ hooks/). The domain
  // math lives here; UI consumes it, never the reverse.
  {
    files: ['src/engine/**/*.{ts,tsx}'],
    languageOptions: {
      // Engine code runs anywhere (node, worker, test). No browser globals.
      globals: {},
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'engine/ must stay pure — no React.' },
            { name: 'react-dom', message: 'engine/ must stay pure — no React DOM.' },
          ],
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'engine/ must stay pure — no React.',
            },
            {
              group: [
                '**/features',
                '**/features/*',
                '**/components',
                '**/components/*',
                '**/hooks',
                '**/hooks/*',
              ],
              message: 'engine/ must not depend on UI layers (features/ components/ hooks/).',
            },
          ],
        },
      ],
      // "No DOM" cannot be expressed as a forbidden import — DOM is ambient.
      // Block the globals so engine math stays portable and unit-testable.
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'engine/ must be DOM-free.' },
        { name: 'document', message: 'engine/ must be DOM-free.' },
        { name: 'navigator', message: 'engine/ must be DOM-free.' },
        { name: 'localStorage', message: 'engine/ must be DOM-free.' },
      ],
    },
  },

  // Node-context tooling configs.
  {
    files: ['*.config.{ts,js}', 'playwright.config.ts'],
    languageOptions: { globals: globals.node },
  },
);
