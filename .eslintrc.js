module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'no-plusplus': 'off',
    'arrow-parens': 'off',
    'no-use-before-define': 'off',
    'consistent-return': 'off',
    'new-cap': 'off',
    'no-underscore-dangle': 'off',
  },
};
