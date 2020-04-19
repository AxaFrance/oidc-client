module.exports = {
  cacheDirectory: '.cache/jest',
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|scss)$': '<rootDir>/__mocks__/styleMock.js',
    '@axa-fr/react-oidc-context': '<rootDir>/packages/context/dist',
    '@axa-fr/react-oidc-core': '<rootDir>/packages/core/dist',
    '@axa-fr/react-oidc-fetch-core': '<rootDir>/packages/fetch-core/dist',
  },
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
  testURL: 'http://localhost',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
