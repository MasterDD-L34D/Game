module.exports = {
  root: true,
  ignorePatterns: [
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
    '*.config.ts',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.vite/**',
    'node_modules/',
    '**/node_modules/**',
    'logs/',
    'reports/',
    'data/',
    'packs/',
    'public/',
  ],
  env: {
    es2022: true,
    node: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
      extends: ['plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-undef': 'off',
        'no-useless-escape': 'off',
      },
    },
    {
      files: ['*.tsx', '*.jsx'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['react', 'react-hooks'],
      extends: ['plugin:react/recommended', 'plugin:react-hooks/recommended'],
      settings: {
        react: {
          version: 'detect',
        },
      },
      env: {
        browser: true,
      },
      rules: {
        'react/no-unescaped-entities': 'off',
      },
    },
    {
      files: ['*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: {
          ts: '@typescript-eslint/parser',
        },
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      extends: ['plugin:vue/vue3-recommended'],
      env: {
        browser: true,
      },
      rules: {
        'vue/max-attributes-per-line': 'off',
        'vue/singleline-html-element-content-newline': 'off',
        'vue/html-self-closing': 'off',
        'no-unused-vars': 'off',
        'vue/attributes-order': 'off',
        'vue/require-explicit-emits': 'off',
        'vue/no-v-html': 'off',
        'vue/no-v-text-v-html-on-component': 'off',
        'vue/no-dupe-keys': 'off',
      },
    },
    {
      files: ['webapp/**/*.{js,ts,tsx,vue}'],
      env: {
        browser: true,
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        HTMLElementTagNameMap: 'readonly',
      },
    },
    {
      files: [
        'webapp/tests/**/*.{test,spec}.{js,ts,tsx}',
        'tools/ts/tests/**/*.{test,spec}.{ts,tsx}',
        'tests/**/*.{test,spec}.{js,ts}'
      ],
      plugins: ['@vitest'],
      extends: ['plugin:@vitest/legacy-recommended'],
      rules: {
        '@vitest/no-import-node-test': 'off',
      },
      env: {
        node: true,
      },
    },
    {
      files: ['*.cjs'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
};
