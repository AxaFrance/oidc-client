import path from 'node:path';

import { defineConfig } from '@playwright/test';

const cwd = path.resolve(__dirname, '../..');

export default defineConfig({
  testDir: '.',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'report', open: 'never' }]],
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 960 },
    trace: 'off',
    screenshot: 'off',
  },
  webServer: [
    {
      command: 'node examples/e2e/start-server.mjs',
      cwd,
      url: 'http://localhost:7001/health',
      timeout: 120_000,
    },
    { command: 'pnpm demo:react', cwd, url: 'http://localhost:5173', timeout: 60_000 },
    { command: 'pnpm demo:native', cwd, url: 'http://localhost:5174', timeout: 60_000 },
  ],
});
