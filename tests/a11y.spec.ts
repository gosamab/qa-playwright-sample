import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { go, desktopChromeOnly } from './helpers';
import fs from 'node:fs';

// Automated WCAG 2.2 A/AA scan with axe-core. REPORT-ONLY: violations are attached and written to
// test-results/a11y-findings.json. Automated tools catch only part of WCAG; keyboard and screen-reader
// passes are still manual work.

const PAGES = ['/', '/category/hand-tools', '/contact', '/auth/login'];

test('axe WCAG 2.2 A/AA scan of key pages (report-only)', async ({ page }, testInfo) => {
  desktopChromeOnly(testInfo);
  const all: Record<string, { id: string; impact: string | null | undefined; help: string; nodes: number; sample: string }[]> = {};
  for (const path of PAGES) {
    await go(page, path);
    await page.waitForTimeout(800);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    all[path] = r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.target.join(' ') ?? '' }));
  }
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/a11y-findings.json', JSON.stringify(all, null, 2));
  await testInfo.attach('a11y-findings', { body: JSON.stringify(all, null, 2), contentType: 'application/json' });
  expect(Object.keys(all).length).toBe(PAGES.length); // the scan itself ran; violations are reported, not asserted
});
