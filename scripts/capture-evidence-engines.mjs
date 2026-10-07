import { chromium, webkit, devices } from '@playwright/test';
const U = 'https://with-bugs.practicesoftwaretesting.com/#';
const E = 'report/evidence/';
for (const [name, bt, opts] of [['chrome-desktop', chromium, { viewport: { width: 1440, height: 900 } }], ['safari-desktop-webkit', webkit, { viewport: { width: 1440, height: 900 } }], ['pixel7-emulated', chromium, devices['Pixel 7']]]) {
  const b = await bt.launch(); const p = await (await b.newContext(opts)).newPage();
  await p.goto(U + '/product/1', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  // screenshot the element that holds both buttons (scrolls into view on small screens)
  const holder = p.locator('[data-test=add-to-cart]').locator('xpath=..');
  await holder.scrollIntoViewIfNeeded();
  await holder.screenshot({ path: `${E}BUG-13-buttons-${name}.png` });
  if (name === 'chrome-desktop') {
    await p.goto(U + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${E}BUG-12-sorth-serch-labels.png`, clip: { x: 60, y: 480, width: 330, height: 360 } });
  }
  await b.close();
}
console.log('ok');
