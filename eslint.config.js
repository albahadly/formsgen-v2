import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'tools/proof/work/**', 'apps/builder/src/__proof__/**', 'examples/*/src/forms/**', 'examples/html/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    // The sample submission server: plain Node, logs to the console.
    files: ['packages/submit-server/**/*.mjs'],
    languageOptions: { globals: { Buffer: 'readonly', process: 'readonly' } },
    rules: { 'no-console': 'off' },
  },
  {
    // The verification toolkit: Node scripts that drive browsers and print results.
    files: ['tools/proof/**/*.mjs', 'tools/proof/**/*.ts', 'examples/update.mjs'],
    languageOptions: { globals: { Buffer: 'readonly', process: 'readonly', console: 'readonly', fetch: 'readonly', URL: 'readonly', setTimeout: 'readonly', document: 'readonly', window: 'readonly', localStorage: 'readonly', getComputedStyle: 'readonly', matchMedia: 'readonly' } },
    rules: { 'no-console': 'off', 'no-undef': 'off' },
  },
)
