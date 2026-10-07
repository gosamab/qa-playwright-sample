import { test, expect } from '@playwright/test';
import { go, knownBug, watchErrors, IS_BUGGY } from './helpers';

const PHONES = ['iphone-14', 'pixel-7'];

// Core pages load and core shop actions work. Runs on every device/browser project.

test.describe('smoke: pages load', () => {
  test('home renders a product grid', async ({ page }) => {
    await go(page, '/');
    await expect(page.locator('[data-test=product-name]').first()).toBeVisible();
    expect(await page.locator('[data-test=product-name]').count()).toBeGreaterThan(0);
  });

  test('home has no console errors or failed resource requests', async ({ page }) => {
    knownBug('BUG-09', 'home requests broken.png (404) for two images');
    const errors = watchErrors(page);
    await go(page, '/');
    await page.waitForTimeout(1500);
    test.info().annotations.push({ type: 'errors', description: errors.join(' | ') || 'none' });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('category page (Hand Tools) shows title and products', async ({ page }) => {
    await go(page, '/category/hand-tools');
    await expect(page.locator('[data-test=page-title]')).toContainText(/hand tools/i);
    expect(await page.locator('[data-test=product-name]').count()).toBeGreaterThan(0);
  });

  test('product page shows name and price', async ({ page }) => {
    await go(page, '/');
    await page.locator('[data-test=product-name]').first().click();
    await expect(page.locator('[data-test=product-name]')).toBeVisible();
    await expect(page.locator('[data-test=unit-price]')).toHaveText(/\d+\.\d{2}/);
  });

  test('search "pliers" returns only matching products', async ({ page }, testInfo) => {
    // On phones the search box sits in a collapsed "Filters" panel, which never opens on the buggy build (BUG-16).
    if (PHONES.includes(testInfo.project.name)) knownBug('BUG-16', 'phones: "Filters" toggle does not open, so search is unreachable');
    await go(page, '/');
    const toggle = page.locator('a[data-test=filters], button[data-test=filters]').first();
    if (!(await page.locator('[data-test=search-query]').isVisible()) && await toggle.isVisible()) { await toggle.click(); await page.waitForTimeout(800); }
    await page.fill('[data-test=search-query]', 'pliers');
    await page.click('[data-test=search-submit]');
    await expect(page.getByText(/Searched for: pliers/i)).toBeVisible();
    // the caption renders before the grid re-renders, so poll until the result list settles
    await expect.poll(async () => (await page.locator('[data-test=product-name]').allTextContents())
      .filter(n => !n.toLowerCase().includes('pliers')).length, { timeout: 10_000 }).toBe(0);
    expect(await page.locator('[data-test=product-name]').count()).toBeGreaterThan(0);
  });
});

test.describe('smoke: navigation', () => {
  test('"Home" nav link points to the home page', async ({ page }) => {
    knownBug('BUG-01', '"Home" nav link opens the Contact page');
    await go(page, '/');
    const href = await page.locator('[data-test=nav-home]').getAttribute('href');
    expect(href === '/' || href === '#/' || href === '/#/', `nav-home href = ${href}`).toBeTruthy();
  });

  test('every Categories menu link opens a real, non-empty category', async ({ page }) => {
    knownBug('BUG-02', 'Categories menu: item labelled "UNDEFINED" opens "Category: Undefined" (0 products); "Chainsaws" opens a 404 page');
    await go(page, '/');
    const links = await page.$$eval('[data-test^=nav-]', els => els
      .filter(e => /category|tools|chainsaws/i.test(e.getAttribute('data-test') + ' ' + (e.getAttribute('href') ?? '')))
      .filter(e => !['nav-categories'].includes(e.getAttribute('data-test')!))
      .map(e => ({ id: e.getAttribute('data-test')!, href: e.getAttribute('href')! })));
    const broken: string[] = [];
    for (const l of links) {
      await page.goto(l.href.startsWith('#') ? '/' + l.href : l.href, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      const products = await page.locator('[data-test=product-name]').count();
      const title = (await page.locator('[data-test=page-title]').textContent({ timeout: 1000 }).catch(() => '')) ?? '';
      if (/undefined/i.test(l.href + title) || products === 0) broken.push(`${l.id} -> ${l.href} (title "${title.trim()}", ${products} products)`);
    }
    expect(broken, broken.join('\n')).toEqual([]);
  });
});

test('interface labels are spelled correctly', async ({ page }) => {
  knownBug('BUG-12', 'UI copy typos: "Contakt" (main nav), "Sorth" (sort heading), "Serch" (search button)');
  await go(page, '/');
  const typos: string[] = [];
  if (!/^\s*Contact\s*$/.test((await page.locator('[data-test=nav-contact]').textContent()) ?? '')) typos.push('nav: Contakt');
  for (const t of ['Sorth', 'Serch']) if (await page.getByText(t, { exact: true }).count()) typos.push(t);
  expect(typos, typos.join(', ')).toEqual([]);
});

test('"Filters" toggle on narrow screens reveals search and sort', async ({ page }, testInfo) => {
  test.skip(!PHONES.includes(testInfo.project.name), 'toggle only exists below 768px (phone projects)');
  knownBug('BUG-16', 'below 768px the "Filters" toggle does nothing; search, sort and filters are unreachable');
  await go(page, '/');
  await page.locator('a[data-test=filters], button[data-test=filters]').first().click();
  await expect(page.locator('[data-test=search-query]')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('[data-test=sort]')).toBeVisible({ timeout: 3000 });
});

test.describe('smoke: shop actions', () => {
  test('sort "Price (Low - High)" orders prices ascending', async ({ page }, testInfo) => {
    test.skip(IS_BUGGY && PHONES.includes(testInfo.project.name), 'sort control unreachable on phones (blocked by BUG-16)');
    knownBug('BUG-03', 'sort labels are inverted: "Low - High" sorts high to low, "A - Z" sorts Z to A');
    await go(page, '/');
    const before = (await page.locator('[data-test=product-name]').allTextContents()).join('|');
    await page.selectOption('[data-test=sort]', { label: 'Price (Low - High)' });
    await page.waitForFunction(b => [...document.querySelectorAll('[data-test=product-name]')].map(x => x.textContent!.trim()).join('|') !== b, before);
    const prices = (await page.locator('[data-test=product-price]').allTextContents()).map(p => parseFloat(p.replace(/[^\d.]/g, '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('sort "Name (A - Z)" orders names alphabetically', async ({ page }, testInfo) => {
    test.skip(IS_BUGGY && PHONES.includes(testInfo.project.name), 'sort control unreachable on phones (blocked by BUG-16)');
    knownBug('BUG-03', 'sort labels are inverted');
    await go(page, '/');
    const before = (await page.locator('[data-test=product-name]').allTextContents()).join('|');
    await page.selectOption('[data-test=sort]', { label: 'Name (A - Z)' });
    await page.waitForFunction(b => [...document.querySelectorAll('[data-test=product-name]')].map(x => x.textContent!.trim()).join('|') !== b, before);
    const names = (await page.locator('[data-test=product-name]').allTextContents()).map(n => n.trim());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  test('quantity "+" button increases the quantity', async ({ page }) => {
    knownBug('BUG-04', 'quantity "+" button does nothing; quantity stays 1');
    await go(page, '/');
    await page.locator('[data-test=product-name]').first().click();
    await page.click('[data-test=increase-quantity]');
    await page.click('[data-test=increase-quantity]');
    await expect(page.locator('[data-test=quantity]')).toHaveValue('3');
  });

  test('add to cart shows a success message', async ({ page }) => {
    knownBug('BUG-05', 'add to cart shows "Oeps, something went wrong." although the cart badge updates');
    await go(page, '/');
    await page.locator('[data-test=product-name]').first().click();
    await page.click('[data-test=add-to-cart]');
    await expect(page.getByText(/added to shopping cart/i)).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
  });

  test('cart badge appears after adding a product', async ({ page }) => {
    await go(page, '/');
    await page.locator('[data-test=product-name]').first().click();
    await page.click('[data-test=add-to-cart]');
    await expect(page.locator('[data-test=cart-quantity]')).toHaveText(/\d+/);
  });
});

test('target build under test', async () => {
  test.info().annotations.push({ type: 'target', description: IS_BUGGY ? 'with-bugs build' : 'reference build' });
});
