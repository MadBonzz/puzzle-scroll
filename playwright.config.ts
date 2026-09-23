import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    headless: true,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'mobile-320', testMatch: /mobile-layout\.spec\.ts/, use: { viewport: { width: 320, height: 700 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'mobile-430', testMatch: /mobile-layout\.spec\.ts/, use: { viewport: { width: 430, height: 932 } } }
  ],
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 15_000
  }
});
