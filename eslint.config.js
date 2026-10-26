import js from '@eslint/js';
import lit from 'eslint-plugin-lit';
import wc from 'eslint-plugin-wc';
import {defineConfig, globalIgnores} from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['dist/', 'playwright-report/', 'test-results/']),
  js.configs.recommended,
  wc.configs['flat/recommended'],
  lit.configs['flat/recommended'],
  {languageOptions: {globals: globals.browser}},
  {files: ['*.config.js', 'test/integration/**/*.js'], languageOptions: {globals: globals.node}},
]);
