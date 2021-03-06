module.exports = {
  extends: [
    '@alorel/eslint-config-base',
    '@alorel/eslint-config-typescript'
  ],
  ignorePatterns: [
    '**/.eslintrc.js',
    '/projects/*/fixture-output',
    '/projects/core/test-input.js',
    '/projects/core/autoinit-wasm-import.js',
    '/dist',
    '/coverage',
    '/**/*.d.ts',
    '/tmp.ts',
    '/tmp.js',
    '/rollup*.config.js',
    '/build'
  ],
  root: true,
  parserOptions: {
    project: require('path').join(__dirname, 'tsconfig.json')
  },
  rules: {
    '@typescript-eslint/consistent-type-imports': ['error', {prefer: 'type-imports'}],
    'no-duplicate-imports': 'off'
  }
};
