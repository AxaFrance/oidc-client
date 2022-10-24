module.exports = {
    extends: ['./config/defaultEslintConfig'], 
    parserOptions: {
      project: './tsconfig.eslint.json',
      tsconfigRootDir: __dirname,
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          'selector': 'variable',
          'types': ['boolean'],
          'format': ['PascalCase'],
          'prefix': ['is', 'with', 'should', 'has', 'can', 'did', 'will']
        }
      ]
    }
  }