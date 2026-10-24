import { defineConfig } from '@playwright/test';
const production = process.env.PLAYWRIGHT_PRODUCTION === '1';
const port = production ? 3001 : 3000;
export default defineConfig({
  ...(production ? { testMatch: 'pwa.spec.ts' } : { testIgnore: 'pwa.spec.ts' }),
  testDir: './tests/e2e',
  outputDir: production ? './test-results/pwa' : './test-results/browser',
  fullyParallel: true,
  workers: 2,
  timeout: 45000,
  expect: { timeout: 8000 },
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: production ? './playwright-report/pwa' : './playwright-report/browser',
      },
    ],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: production ? 'npm run start -- --port 3001' : 'npm run dev',
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !production,
    timeout: 60000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
