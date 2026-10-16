// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Allow any in grpc callbacks (proto loader returns any)
      '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: false }],
      // Unsafe rules set to warn during progressive typing phases
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Require awaiting promises
      '@typescript-eslint/no-floating-promises': 'error',
      // Prefer nullish coalescing
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      // No non-null assertion (use optional chaining)
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Consistent type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      // Unused vars as errors
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Config files can use any
    files: ['*.config.{js,ts,mjs}', '**/*.config.{js,ts,mjs}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.prisma/**',
      '**/src/generated/**',
      '**/prisma/migrations/**',
      'eslint.config.mjs',
      'commitlint.config.js',
    ],
  },
);
