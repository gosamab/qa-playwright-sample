import { test, expect } from '@playwright/test';
import { go, desktopChromeOnly } from './helpers';
import fs from 'node:fs';

// Metadata audit for key pages. REPORT-ONLY: findings are attached to the test and written to
// test-results/seo-findings.json; the test itself only fails if a page has no <title> at all.

const PAGES = ['/', '/category/hand-tools', '/contact', '/auth/login'];

test('metadata audit of key pages (report-only)', async ({ page }, testInfo) => {
  desktopChromeOnly(testInfo);
  const findings: Record<string, string[]> = {};
  const titles: string[] = [];
  for (const path of PAGES) {
    await go(page, path);
    const m = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name=description]')?.getAttribute('content') ?? '',
      canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href') ?? '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '',
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
      lang: document.documentElement.getAttribute('lang') ?? '',
      h1: document.querySelectorAll('h1').length,
    }));
    const f: string[] = [];
    if (!m.title) f.push('missing <title>');
    if (!m.description) f.push('missing meta description');
    if (!m.canonical) f.push('missing canonical');
    if (!m.ogTitle) f.push('missing og:title');
    if (!m.ogImage) f.push('missing og:image');
    if (!m.lang) f.push('missing <html lang>');
    if (m.h1 !== 1) f.push(`${m.h1} <h1> elements (expected 1)`);
    findings[path] = f;
    titles.push(m.title);
    expect(m.title, `${path} has a <title>`).not.toBe('');
  }
  if (new Set(titles).size < titles.length) findings['(all pages)'] = [`page titles are not unique: "${titles[0]}"`];
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/seo-findings.json', JSON.stringify(findings, null, 2));
  await testInfo.attach('seo-findings', { body: JSON.stringify(findings, null, 2), contentType: 'application/json' });
});
