import { test, expect } from '@playwright/test';
import { go, desktopChromeOnly } from './helpers';

// Breakpoint sweep: screenshots + horizontal-overflow and key-element checks.
// Runs once (desktop-chrome) because each test sets its own viewport; the device projects cover real-device emulation.

const BREAKPOINTS = [360, 390, 768, 1024, 1280, 1440];
const PAGES = [
  { name: 'home', path: '/', key: '[data-test=product-name]' },
  { name: 'contact', path: '/contact', key: '[data-test=contact-submit]' },
  { name: 'login', path: '/auth/login', key: '[data-test=login-submit]' },
];

for (const pg of PAGES) {
  test(`${pg.name}: no horizontal overflow and key element visible at all breakpoints`, async ({ page }, testInfo) => {
    desktopChromeOnly(testInfo);
    const problems: string[] = [];
    for (const w of BREAKPOINTS) {
      await page.setViewportSize({ width: w, height: 900 });
      await go(page, pg.path);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) problems.push(`${w}px: page is ${overflow}px wider than the viewport`);
      if (!(await page.locator(pg.key).first().isVisible())) problems.push(`${w}px: ${pg.key} not visible`);
      await page.screenshot({ path: testInfo.outputPath(`${pg.name}-${w}.png`), fullPage: true });
    }
    test.info().annotations.push({ type: 'responsive', description: problems.join(' | ') || 'no problems' });
    expect(problems, problems.join('\n')).toEqual([]);
  });
}
