import { test, expect } from '@playwright/test';
import { go, knownBug, IS_BUGGY } from './helpers';

// "Messy content" checks: images that fail, long names, empty fields, price formatting.

test('all images on the home page load', async ({ page }) => {
  knownBug('BUG-09', 'home page images point to broken.png (404)');
  const broken: string[] = [];
  page.on('response', r => { if (r.request().resourceType() === 'image' && r.status() >= 400) broken.push(`${r.status()} ${r.url()}`); });
  await go(page, '/');
  await page.waitForTimeout(1500);
  const notRendered = await page.$$eval('img', imgs => imgs
    .filter(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0)
    .map(i => i.getAttribute('src')));
  test.info().annotations.push({ type: 'broken-images', description: [...broken, ...notRendered].join(' | ') || 'none' });
  expect([...broken, ...notRendered]).toEqual([]);
});

test('long product names stay inside their cards', async ({ page, browserName }) => {
  // Engine-specific: in Firefox the long name is clipped (white-space: nowrap); Chromium and WebKit are fine.
  test.info().annotations.push({ type: 'known-bug', description: 'BUG-14: long product name clipped without ellipsis in Firefox' });
  test.fail(IS_BUGGY && browserName === 'firefox', 'BUG-14: Firefox-only clipping');
  await go(page, '/');
  const overflowing = await page.$$eval('[data-test=product-name]', els => els
    .filter(e => e.scrollWidth > e.clientWidth + 1)
    .map(e => e.textContent!.trim()));
  expect(overflowing).toEqual([]);
});

test('product names in the grid share one alignment', async ({ page }) => {
  knownBug('BUG-15', 'some product names in the grid are right-aligned, others left-aligned');
  await go(page, '/');
  const aligns = await page.$$eval('[data-test=product-name]', els => [...new Set(els.map(e => getComputedStyle(e).textAlign))]);
  expect(aligns.length, `alignments found: ${aligns.join(', ')}`).toBe(1);
});

test('prices are formatted as $0.00', async ({ page }) => {
  await go(page, '/');
  const prices = await page.locator('[data-test=product-price]').allTextContents();
  for (const p of prices) expect(p.trim()).toMatch(/^\$\d+\.\d{2}$/);
});

test('product page has a non-empty description', async ({ page }) => {
  await go(page, '/');
  await page.locator('[data-test=product-name]').first().click();
  await expect(page.locator('[data-test=product-description]')).not.toHaveText(/^\s*$/);
});

test('product page headings are spelled correctly and there is one h1', async ({ page }) => {
  knownBug('BUG-10', 'product page heading reads "Reltded products" and is a second h1');
  await go(page, '/');
  await page.locator('[data-test=product-name]').first().click();
  await expect(page.locator('[data-test=product-name]')).toBeVisible();
  const headings = await page.locator('h1, h2, h3').allTextContents();
  expect(headings.join(' | ')).not.toMatch(/reltded/i);
  expect(await page.locator('h1').count()).toBe(1);
});

test('"Add to cart" and "Add to favourites" buttons do not overlap', async ({ page, browserName }) => {
  // Engine-specific: reproduces only in Chromium (desktop Chrome, Pixel 7 emulation); WebKit and Firefox are fine.
  test.info().annotations.push({ type: 'known-bug', description: 'BUG-13: favourites button overlaps "Add to cart" by 50px in Chromium' });
  test.fail(IS_BUGGY && browserName === 'chromium', 'BUG-13: Chromium-only overlap');
  await go(page, '/');
  await page.locator('[data-test=product-name]').first().click();
  const a = (await page.locator('[data-test=add-to-cart]').boundingBox())!;
  const f = (await page.locator('[data-test=add-to-favorites]').boundingBox())!;
  const overlap = Math.min(a.x + a.width, f.x + f.width) - Math.max(a.x, f.x);
  const sameRow = Math.abs(a.y - f.y) < a.height;
  expect(sameRow ? overlap : 0, `horizontal overlap ${overlap.toFixed(1)}px`).toBeLessThanOrEqual(2); // 1px border join is normal
});
