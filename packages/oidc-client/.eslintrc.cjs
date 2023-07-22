module.exports = {
    extends: [__dirname+'/config/defaultEslintConfig.cjs'], 
    parserOptions: {
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