const error = 2;
const warn = 1;
const ignore = 0;

module.exports = {
  root: true,
  extends: [
    'airbnb',
    'plugin:jest/recommended',
    'plugin:import/react-native',
    'prettier',
    'prettier/react',
  ],
  plugins: ['prettier', 'jest', 'import', 'react', 'jsx-a11y', 'json', 'react-hooks'],
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 8,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
    node: true,
    browser: true,
    'jest/globals': true,
  },
  settings: {
    'import/core-modules': ['enzyme'],
    'import/ignore': ['node_modules\\/(?!@af-react-oidc)'],
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  rules: {
    'prettier/prettier': [
      warn,
      {
        printWidth: 100,
        tabWidth: 2,
        bracketSpacing: true,
        trailingComma: 'es5',
        singleQuote: true,
      },
    ],
    'no-debugger': process.env.NODE_ENV === 'production' ? error : ignore,
    'class-methods-use-this': ignore,
    'linebreak-style': 0,
    'import/extensions': [ignore],
    'import/no-unresolved': [ignore],
    'import/no-extraneous-dependencies': [ignore],
    'import/prefer-default-export': ignore,
    'import/default': error,
    'import/named': error,
    'import/namespace': error,
    'react/jsx-filename-extension': [
      warn,
      {
        extensions: ['.js', '.jsx'],
      },
    ],
    'react/no-unescaped-entities': ignore,
    'jsx-a11y/label-has-for': [
      error,
      {
        required: {
          some: ['nesting', 'id'],
        },
      },
    ],
    'jsx-a11y/anchor-is-valid': [
      error,
      {
        components: ['RoutedLink', 'MenuLink', 'LinkTo', 'Link'],
        specialLink: ['overrideParams', 'kind', 'story', 'to'],
      },
    ],
    'no-underscore-dangle': [
      error,
      {
        allow: ['__STORYBOOK_CLIENT_API__', '__STORYBOOK_ADDONS_CHANNEL__'],
      },
    ],
    'react/forbid-prop-types': [ignore],
    'react/prop-types': [warn],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
