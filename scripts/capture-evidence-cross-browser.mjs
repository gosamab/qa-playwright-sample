// Evidence for engine/viewport-specific bugs: BUG-14 (Firefox clipping) and BUG-16 (phone "Filters" toggle).
import { chromium, firefox, webkit, devices } from '@playwright/test';
const BUG = 'https://with-bugs.practicesoftwaretesting.com/#/', REF = 'https://practicesoftwaretesting.com/', E = 'report/evidence/';
for (const [name, bt, dev] of [['firefox', firefox, devices['Desktop Firefox']], ['chrome', chromium, devices['Desktop Chrome']]]) {
  const b = await bt.launch(); const p = await (await b.newContext(dev)).newPage();
  await p.goto(BUG, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  const card = p.locator('[data-test=product-name]', { hasText: 'Claw Hammer with Shock' }).first().locator('xpath=ancestor::a[1]');
  await card.scrollIntoViewIfNeeded(); await card.screenshot({ path: `${E}BUG-14-long-name-${name}.png` });
  await b.close();
}
for (const [name, bt, dev] of [['iphone14-emulated', webkit, devices['iPhone 14']], ['pixel7-emulated', chromium, devices['Pixel 7']]]) {
  const b = await bt.launch();
  for (const [tag, url] of [['bug', BUG], ['ref', REF]]) {
    const p = await (await b.newContext(dev)).newPage(); await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    const t = p.locator('a[data-test=filters], button[data-test=filters]').first();
    await t.scrollIntoViewIfNeeded(); await t.click(); await p.waitForTimeout(1500);
    console.log(name, tag, 'search visible after tapping Filters:', await p.locator('[data-test=search-query]').isVisible());
    await p.screenshot({ path: `${E}BUG-16-filters-tapped-${name}-${tag}.png` });
    await p.context().close();
  }
  await b.close();
}
