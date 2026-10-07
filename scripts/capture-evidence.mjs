// Manual-verification helper: reproduces each candidate bug step by step and saves evidence screenshots.
import { chromium, webkit, firefox } from '@playwright/test';
const B = 'https://with-bugs.practicesoftwaretesting.com/#', C = 'https://practicesoftwaretesting.com';
const E = 'report/evidence/';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const msgs = () => p.$$eval('.alert, .invalid-feedback, [role=alert], .text-danger', e => [...new Set(e.filter(x => x.offsetParent !== null).map(x => x.textContent.trim()).filter(Boolean))]);
const log = (...a) => console.log(...a);
const settle = (ms = 1200) => p.waitForTimeout(ms);

// BUG-01: Home link -> contact
await p.goto(B + '/product/1', { waitUntil: 'networkidle' }); await settle();
await p.click('[data-test=nav-home]'); await settle();
log('BUG-01 url after clicking Home:', p.url(), '| heading:', await p.$$eval('h1,h2,h3', e => e.map(x => x.textContent.trim()).slice(0,2)));
await p.screenshot({ path: E + 'BUG-01-home-link-opens-contact.png' });

// BUG-12 + BUG-02 menu: open categories dropdown
await p.goto(B + '/', { waitUntil: 'networkidle' }); await settle();
await p.click('[data-test=nav-categories]'); await settle(600);
await p.screenshot({ path: E + 'BUG-02-categories-menu.png', clip: { x: 600, y: 0, width: 840, height: 320 } });
await p.screenshot({ path: E + 'BUG-12-nav-contakt.png', clip: { x: 600, y: 0, width: 840, height: 80 } });
await p.click('[data-test=nav-robotic-tools]'); await settle();
log('BUG-02 undefined url:', p.url(), 'title:', (await p.textContent('[data-test=page-title]'))?.trim(), 'products:', await p.locator('[data-test=product-name]').count());
await p.screenshot({ path: E + 'BUG-02-category-undefined.png' });
await p.goto(B + '/', { waitUntil: 'networkidle' }); await settle();
await p.click('[data-test=nav-categories]'); await settle(500); await p.click('[data-test=nav-special-tools]'); await settle();
log('BUG-02 chainsaws url:', p.url(), 'headings:', await p.$$eval('h1,h2,h3,h4', e => e.map(x => x.textContent.trim()).slice(0,3)));
await p.screenshot({ path: E + 'BUG-02-chainsaws-404.png' });

// BUG-03 sort
await p.goto(B + '/', { waitUntil: 'networkidle' }); await settle();
await p.selectOption('[data-test=sort]', { label: 'Price (Low - High)' }); await settle(2500);
log('BUG-03 Low-High prices:', (await p.locator('[data-test=product-price]').allTextContents()).join(' '));
await p.screenshot({ path: E + 'BUG-03-sort-low-high-shows-high-first.png' });
await p.selectOption('[data-test=sort]', { label: 'Name (A - Z)' }); await settle(2500);
log('BUG-03 A-Z names:', (await p.locator('[data-test=product-name]').allTextContents()).map(s=>s.trim()).slice(0,4).join(' | '));

// BUG-04 / BUG-05 / BUG-10 product page
await p.goto(B + '/product/1', { waitUntil: 'networkidle' }); await settle();
log('BUG-10 headings:', await p.$$eval('h1,h2,h3', e => e.map(x => x.tagName + ':' + x.textContent.trim())));
await p.locator('text=Reltded products').scrollIntoViewIfNeeded(); await settle(400);
await p.screenshot({ path: E + 'BUG-10-reltded-products-heading.png' });
await p.evaluate(() => window.scrollTo(0, 0));
await p.click('[data-test=increase-quantity]'); await p.click('[data-test=increase-quantity]'); await settle(600);
log('BUG-04 qty after 2x +:', await p.inputValue('[data-test=quantity]'));
await p.screenshot({ path: E + 'BUG-04-quantity-stays-1.png' });
await p.click('[data-test=add-to-cart]'); await settle(900);
log('BUG-05 toast:', await p.$$eval('[role=alert], .toast, #toast-container *', e => [...new Set(e.map(x => x.textContent.trim()).filter(Boolean))].slice(0,2)), 'badge:', await p.textContent('[data-test=cart-quantity]').catch(()=>null));
await p.screenshot({ path: E + 'BUG-05-add-to-cart-error-toast.png' });

// BUG-06 / BUG-07 / BUG-08 contact
await p.goto(B + '/contact', { waitUntil: 'networkidle' }); await settle();
await p.fill('[data-test=first-name]', 'QA'); await p.fill('[data-test=last-name]', 'Sample');
await p.fill('[data-test=email]', 'not-an-email');
await p.selectOption('[data-test=subject]', { label: 'Customer service' });
await p.fill('[data-test=message]', 'This is an automated sample QA message used to verify the contact form success path only.');
await p.click('[data-test=contact-submit]'); await settle(2000);
log('BUG-06/07 contact messages (invalid email + subject chosen):', await msgs(), '| subject value:', await p.inputValue('[data-test=subject]'));
await p.screenshot({ path: E + 'BUG-06-07-contact-form.png', fullPage: true });
await p.fill('[data-test=email]', 'qa.sample@example.com'); await p.click('[data-test=contact-submit]'); await settle(2000);
log('BUG-07 with valid email:', await msgs(), '| sent:', /thanks/i.test(await p.textContent('body')));
log('BUG-08 options:', (await p.locator('[data-test=subject] option').allTextContents()).join(' | '));
await p.selectOption('[data-test=subject]', { label: 'Error 101: Subject not found' }); await settle(300);
await p.locator('[data-test=subject]').screenshot({ path: E + 'BUG-08-subject-error-option.png' });

// BUG-09 broken images
await p.goto(B + '/', { waitUntil: 'networkidle' }); await settle(1500);
const broken = await p.$$eval('img', im => im.map((i, n) => ({ n, src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, alt: i.getAttribute('alt') })));
log('BUG-09 images:', JSON.stringify(broken.slice(0, 6)));
const firstBroken = p.locator('img[src="broken.png"]').first();
const box = await firstBroken.boundingBox(); log('BUG-09 first broken box:', JSON.stringify(box));
await p.screenshot({ path: E + 'BUG-09-broken-images-home.png' });

// BUG-11 login
await p.goto(B + '/auth/login', { waitUntil: 'networkidle' }); await settle();
await p.click('[data-test=login-submit]'); await settle(1500);
log('BUG-11 login empty:', await msgs());

// reference build comparisons
const q = await ctx.newPage();
await q.goto(C + '/', { waitUntil: 'networkidle' }); await q.waitForTimeout(1500);
await q.selectOption('[data-test=sort]', { label: 'Price (Low - High)' }); await q.waitForTimeout(2500);
log('REF Low-High:', (await q.locator('[data-test=product-price]').allTextContents()).join(' '));
await q.screenshot({ path: E + 'REF-sort-low-high.png' });
await q.goto(C + '/contact', { waitUntil: 'networkidle' }); await q.waitForTimeout(1000);
await q.fill('[data-test=email]', 'not-an-email'); await q.click('[data-test=contact-submit]'); await q.waitForTimeout(1000);
log('REF contact invalid email msgs:', await q.$$eval('.alert, [role=alert], .text-danger', e => [...new Set(e.filter(x => x.offsetParent !== null).map(x => x.textContent.trim()).filter(Boolean))]));
log('versions: chromium', browser.version());
await browser.close();
for (const [n, t] of [['webkit', webkit], ['firefox', firefox]]) { const bb = await t.launch(); log('versions:', n, bb.version()); await bb.close(); }
