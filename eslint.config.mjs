import js from '@eslint/js';
import json from '@eslint/json';
import css from '@eslint/css';
import { defineConfig } from 'eslint/config';


export default defineConfig([
  {
    ignores: ['**/package-lock.json'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        imports: 'readonly',
        global: 'readonly',
        log: 'readonly',
      },
    },
    plugins: { js },
    rules: {
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-undef': 'error',
      'no-console': 'off',
      'no-var': 'off',
      'prefer-const': 'warn',
      'comma-dangle': ['warn', 'only-multiline'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', 'never'],
    },
    extends: ['js/recommended']
  },
  {
    files: ['**/*.{json,jsonc}'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended']
  },
  {
    files: ['**/*.css'],
    plugins: { css },
    language: 'css/css',
    extends: ['css/recommended']
  },
]);
