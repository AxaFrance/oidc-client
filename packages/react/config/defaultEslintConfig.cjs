module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
      'standard',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:import/errors',
      'plugin:import/warnings',
      'plugin:import/typescript',
      'plugin:jsx-a11y/recommended',
    ],
    plugins: ['simple-import-sort', 'testing-library'],
    env: {
      node: true,
      es6: true,
      browser: true,
    },
    parserOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      // typescript-eslint specific options
      warnOnUnsupportedTypeScriptVersion: true,
    },
    rules: {
    //   '@typescript-eslint/indent': ['error', 2],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_|req|res|next|err|ctx|args|context|info',
          ignoreRestSiblings: true,
        },
      ],
      'no-array-constructor': 'off',
      '@typescript-eslint/no-array-constructor': 'warn',
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'warn',
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': [
        'warn',
        {
          functions: false,
          classes: false,
          variables: false,
          typedefs: false,
        },
      ],
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'semi',
            requireLast: true,
          },
          singleline: {
            delimiter: 'semi',
            requireLast: false,
          },
        },
      ],
      camelcase: 'off',
      'comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'always-multiline',
          functions: 'always-multiline',
        },
      ],
      'array-callback-return': 'warn',
      'jsx-quotes': ['error', 'prefer-double'],
    //   'max-len': ['error', { code: 120 }],
      indent: 'off',
    //   quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'space-before-function-paren': 'off',
  
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/default': 'off',
      'import/named': 'off',
      'import/namespace': 'off',
      'import/no-unresolved': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'react/prop-types': 'off',
      'react/jsx-wrap-multilines': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      // https://github.com/facebook/react/tree/master/packages/eslint-plugin-react-hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
    },
  
    overrides: [
      {
        files: ['*.js', '*.jsx'],
        rules: {
          '@typescript-eslint/no-var-requires': 'off',
        },
      },
      {
        // 3) Now we enable eslint-plugin-testing-library rules or preset only for matching files!
        files: ['**/?(*.)+(spec|test).[jt]s?(x)'],
        extends: ['plugin:testing-library/react'],
        rules: {
          'testing-library/await-async-query': 'error',
          'testing-library/no-await-sync-query': 'error',
          'testing-library/no-debugging-utils': 'warn',
          'testing-library/no-dom-import': 'off',
          'testing-library/no-unnecessary-act': 'off',
        },
      },
    ],
  
    settings: {
      react: {
        version: 'detect',
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  };