// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config({
  files: ['src/**/*.ts'],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      ...globals.browser,
      ...globals.jquery,
      ...globals.webextensions,
      ...globals.node,
    }
  },
  extends: [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
  ],
},
  {
    ignores: [
      "selectorgadget/",
      "tmp/",
      "public/",
      "dist/",
    ]
  });
