import { Page, TestInfo, test } from '@playwright/test';

export const BASE = process.env.BASE_URL ?? 'https://with-bugs.practicesoftwaretesting.com';
// The with-bugs build uses hash routing (/#/contact); the clean reference build uses path routing (/contact).
export const IS_BUGGY = BASE.includes('with-bugs');
export const route = (path: string) => (IS_BUGGY ? `/#${path}` : path);

export async function go(page: Page, path: string) {
  await page.goto(route(path), { waitUntil: 'networkidle' });
}

/**
 * Marks a check that currently reproduces a known, manually confirmed defect.
 * On the buggy build the test is EXPECTED to fail (test.fail). Once the bug is fixed, Playwright reports
 * "expected to fail, but passed" — that is the signal to remove this marker. On any other build the test runs normally.
 */
export function knownBug(id: string, summary: string) {
  test.info().annotations.push({ type: 'known-bug', description: `${id}: ${summary}` });
  test.fail(IS_BUGGY, `${id}: ${summary}`);
}

/** Desktop-only suites (crawl, SEO, a11y, breakpoint sweep) run once to keep load on the shared site low. */
export function desktopChromeOnly(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'runs once on desktop-chrome to keep load low');
}

/** Collect console errors and failed/4xx-5xx network responses for a page. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('requestfailed', r => errors.push(`failed: ${r.url()} (${r.failure()?.errorText})`));
  page.on('response', r => {
    // 401 on /users/me is the normal "not logged in" probe on both builds; ignore it.
    if (r.status() >= 400 && !r.url().endsWith('/users/me')) errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  return errors;
}

export const visibleMessages = (page: Page) =>
  page.$$eval('.alert, .invalid-feedback, [role=alert], .text-danger', els =>
    [...new Set(els.filter(e => (e as HTMLElement).offsetParent !== null).map(e => e.textContent!.trim()).filter(Boolean))]);
