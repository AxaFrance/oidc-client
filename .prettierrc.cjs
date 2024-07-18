module.exports = {
  printWidth: 100,
  tabWidth: 2,
  trailingComma: 'all',
  arrowParens: 'avoid',
  endOfLine: 'auto',
  bracketSameLine: false,
  bracketSpacing: true,
  singleQuote: true,
  useTabs: false,
  semi: true,
  overrides: [
    {
      files: ['.*', '*.json', '*.md', '*.toml', '*.yml'],
      options: {
        useTabs: false,
      },
    },
  ],
};
