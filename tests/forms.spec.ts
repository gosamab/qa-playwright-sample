import { test, expect } from '@playwright/test';
import { go, knownBug, visibleMessages } from './helpers';

// Contact, login and register validation: empty, invalid, long and unusual input, plus the success path.
// No accounts are created and nothing is spammed: the contact success path is only attempted where the form allows it.

const LONG = 'Lorem ipsum dolor sit amet '.repeat(80); // ~2,100 characters
const MESSAGE_OK = 'This is an automated sample QA message used to verify the contact form success path only.';

test.describe('contact form', () => {
  test('empty submit shows a required message for every field', async ({ page }) => {
    await go(page, '/contact');
    await page.click('[data-test=contact-submit]');
    const msgs = await visibleMessages(page);
    for (const f of ['First name', 'Last name', 'Email', 'Subject', 'Message']) {
      expect(msgs.some(m => m.startsWith(f)), `${f} required message; got ${JSON.stringify(msgs)}`).toBeTruthy();
    }
  });

  test('invalid email is rejected', async ({ page }) => {
    knownBug('BUG-06', 'contact form accepts "not-an-email" as an email address');
    await go(page, '/contact');
    await page.fill('[data-test=email]', 'not-an-email');
    await page.click('[data-test=contact-submit]');
    expect((await visibleMessages(page)).some(m => /email.*(invalid|format)/i.test(m))).toBeTruthy();
  });

  test('subject dropdown only offers real subjects', async ({ page }) => {
    knownBug('BUG-08', 'subject list contains "Error 101: Subject not found" and "Error 202: Translation error"');
    await go(page, '/contact');
    const options = await page.locator('[data-test=subject] option').allTextContents();
    expect(options.filter(o => /error/i.test(o)), options.join(' | ')).toEqual([]);
  });

  test('valid message with a selected subject can be submitted', async ({ page }) => {
    knownBug('BUG-07', '"Subject is required" stays after a subject is chosen, so the form can never be sent');
    await go(page, '/contact');
    await page.fill('[data-test=first-name]', 'QA');
    await page.fill('[data-test=last-name]', 'Sample');
    await page.fill('[data-test=email]', 'qa.sample@example.com');
    await page.selectOption('[data-test=subject]', { label: 'Customer service' });
    await page.fill('[data-test=message]', MESSAGE_OK);
    await page.click('[data-test=contact-submit]');
    await page.waitForTimeout(2000);
    expect(await visibleMessages(page)).not.toContain('Subject is required');
    await expect(page.getByText(/thanks for your message/i)).toBeVisible();
  });

  test('Arabic and emoji are accepted in name fields', async ({ page }) => {
    await go(page, '/contact');
    await page.fill('[data-test=first-name]', 'أسامة');
    await page.fill('[data-test=last-name]', 'تجربة 😀');
    await expect(page.locator('[data-test=first-name]')).toHaveValue('أسامة');
    await expect(page.locator('[data-test=last-name]')).toHaveValue('تجربة 😀');
  });

  test('very long message does not break the layout', async ({ page }) => {
    await go(page, '/contact');
    await page.fill('[data-test=message]', LONG);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('login form', () => {
  test('empty submit shows field-level required messages', async ({ page }) => {
    knownBug('BUG-11', 'empty login submit shows only "Invalid email or password", no field-level required messages');
    await go(page, '/auth/login');
    await page.click('[data-test=login-submit]');
    const msgs = await visibleMessages(page);
    expect(msgs.some(m => /email.*required/i.test(m)), JSON.stringify(msgs)).toBeTruthy();
    expect(msgs.some(m => /password.*required/i.test(m)), JSON.stringify(msgs)).toBeTruthy();
  });

  test('wrong credentials show a clear error', async ({ page }) => {
    await go(page, '/auth/login');
    await page.fill('[data-test=email]', 'nobody@example.com');
    await page.fill('[data-test=password]', 'WrongPass123!');
    await page.click('[data-test=login-submit]');
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});

test.describe('register form', () => {
  test('empty submit shows required messages', async ({ page }) => {
    await go(page, '/auth/register');
    await page.click('[data-test=register-submit]');
    const msgs = await visibleMessages(page);
    for (const f of [/first name/i, /last name/i, /date of birth/i, /city/i, /phone/i, /mail/i, /password/i]) {
      expect(msgs.some(m => f.test(m)), `${f}; got ${JSON.stringify(msgs)}`).toBeTruthy();
    }
  });

  test('invalid email is rejected', async ({ page }) => {
    await go(page, '/auth/register');
    await page.fill('[data-test=email]', 'not-an-email');
    await page.click('[data-test=register-submit]');
    expect((await visibleMessages(page)).some(m => /mail.*(invalid|format|valid)/i.test(m)), JSON.stringify(await visibleMessages(page))).toBeTruthy();
  });
});
