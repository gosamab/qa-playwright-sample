import { test, expect } from '@playwright/test';
import { go, knownBug, desktopChromeOnly, IS_BUGGY } from './helpers';
import fs from 'node:fs';

// Limited internal link crawl (max 60 pages, sequential). A link is "broken" if the route renders a 404 view,
// shows "undefined", or its document request returns non-2xx. External links are only HEAD-checked, never crawled.

const MAX_PAGES = 60;

test('internal link crawl (<= 60 pages)', async ({ page }, testInfo) => {
  desktopChromeOnly(testInfo);
  test.setTimeout(300_000); // up to 60 sequential page visits
  knownBug('BUG-02', 'Categories menu links lead to "Category: Undefined" and a 404 page');
  await go(page, '/');
  const origin = new URL(page.url()).origin;
  const seen = new Set<string>(); const queue = ['/']; const broken: string[] = []; const external = new Set<string>();
  const norm = (href: string) => {
    if (href.startsWith('http')) { if (!href.startsWith(origin)) { external.add(href); return null; } href = href.slice(origin.length) || '/'; }
    if (href.startsWith('#/')) href = href.slice(1);
    if (href.startsWith('/#/')) href = href.slice(2);
    if (href === '#' || href.startsWith('#') || href.startsWith('mailto:')) return null;
    return href.split('?')[0];
  };
  while (queue.length && seen.size < MAX_PAGES) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    // Hash-route navigations stay in the same document, so page.goto() returns null for them; that is not an error.
    const resp = await page.goto(IS_BUGGY ? `/#${path}` : path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const headings = (await page.locator('h1, h2, h3, h4').allTextContents()).join(' | ');
    const title = (await page.locator('[data-test=page-title]').textContent({ timeout: 1000 }).catch(() => '')) ?? '';
    const reasons: string[] = [];
    if (resp && resp.status() >= 400) reasons.push(`HTTP ${resp.status()}`);
    if (/404 Error|Page Not Found/i.test(headings)) reasons.push('renders the 404 view');
    if (/undefined/i.test(title)) reasons.push(`page title "${title.trim()}"`);
    if (reasons.length) broken.push(`${path}: ${reasons.join(', ')}`);
    for (const href of await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')!))) {
      const n = norm(href); if (n && !seen.has(n) && !queue.includes(n)) queue.push(n);
    }
  }
  const externalBroken: string[] = []; const externalUnverified: string[] = [];
  for (const url of [...external].slice(0, 15)) {
    // Many sites (e.g. Unsplash) answer bots with 401/403; only 404/410/5xx count as broken, the rest is "unverified".
    const r = await page.request.head(url).catch(() => null);
    const st = r?.status() ?? 0;
    if (st === 404 || st === 410 || st >= 500) externalBroken.push(`${url} (${st})`);
    else if (!r || st >= 400) externalUnverified.push(`${url} (${st || 'no response'})`);
  }
  const summary = { crawled: [...seen], broken, external: [...external], externalBroken, externalUnverified };
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/links-findings.json', JSON.stringify(summary, null, 2));
  await testInfo.attach('links-findings', { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
  expect(broken, broken.join('\n')).toEqual([]);
});
