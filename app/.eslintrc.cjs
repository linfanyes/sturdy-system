module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'vue/multi-word-component-names': 'off',
    'vue/require-default-prop': 'off',
    'vue/attributes-order': 'off',
    'vue/no-v-html': 'off',
    'vue/no-unused-vars': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-constant-condition': 'off',
    'no-self-assign': 'error',
  },
  ignorePatterns: ['dist', 'node_modules', '*.config.*'],
}
