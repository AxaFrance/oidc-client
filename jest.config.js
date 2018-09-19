module.exports = {
  cacheDirectory: '.cache/jest',
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|scss)$': '<rootDir>/__mocks__/styleMock.js',
  },
  roots: ['<rootDir>/packages'],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverage: false,
  collectCoverageFrom: ['packages/**/*.{js,jsx}', '!**/dist/**'],
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  setupTestFrameworkScriptFile: './scripts/jest.init.js',
  setupFiles: ['raf/polyfill'],
  testURL: 'http://localhost',
  moduleFileExtensions: [/* 'ts', 'tsx', */ 'js', 'jsx', 'json', 'node'],
};
