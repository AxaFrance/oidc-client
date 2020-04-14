module.exports = {
  cacheDirectory: '.cache/jest',
  roots: ['<rootDir>/packages'],
  transform: {
    '^.+\\.(j|t)sx?$': 'babel-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverage: false,
  collectCoverageFrom: ['packages/**/*.{js,jsx,ts,tsx}', '!**/dist/**', '!**/index.{ts,js}', '!**/*.spec.{js,jsx,ts,tsx}'],
  coverageDirectory: 'coverage',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./scripts/jest.init.js'],
  setupFiles: ['raf/polyfill'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
