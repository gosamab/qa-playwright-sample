import { defineConfig, devices } from '@playwright/test';

// Target: the deliberately buggy Toolshop practice site. Override with BASE_URL to run against another build,
// e.g. BASE_URL=https://practicesoftwaretesting.com (the clean reference build, which uses path routes, not hash routes).
export const BASE_URL = process.env.BASE_URL ?? 'https://with-bugs.practicesoftwaretesting.com';

// IMPORTANT: every project below is a Playwright EMULATION (viewport, user agent, touch, device scale factor).
// Desktop Safari / iPhone / iPad run on Playwright's WebKit build, not on real Apple Safari or real devices.
// Findings that only appear in these projects are labelled "emulation-only" in the report until confirmed on a real device.
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,          // be gentle with a shared public practice site
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    { name: 'desktop-chrome',  use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-safari',  use: { ...devices['Desktop Safari'] } },   // WebKit emulation
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'iphone-14',       use: { ...devices['iPhone 14'] } },        // WebKit emulation
    { name: 'pixel-7',         use: { ...devices['Pixel 7'] } },          // Chromium emulation
    { name: 'ipad',            use: { ...devices['iPad (gen 7)'] } },     // WebKit emulation
  ],
});
