import { expect, test, type Page } from '@playwright/test';

async function openFixture(page: Page, scenario: string) {
  await page.goto(`/?__e2e=${scenario}`);
  await expect(page.getByText('Before you begin')).toBeVisible();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
}

test('E01 final wrong and correct answers preserve feedback before results', async ({ page }) => {
  await openFixture(page, 'final-item');
  await page.getByRole('radio', { name: 'Wrong option' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Incorrect', { exact: true })).toBeVisible();
  await expect(page.getByText('Your answer: Wrong option')).toBeVisible();
  await expect(page.getByText('Correct answer: Verified answer')).toBeVisible();
  await expect(page.getByText('Session complete')).toHaveCount(0);
  await page.getByRole('button', { name: 'View results' }).click();
  await expect(page.getByText('Session complete')).toBeVisible();
  await page.getByRole('button', { name: 'Review answers' }).click();
  await expect(page.getByText('Your answer: Wrong option')).toBeVisible();
  await page.getByRole('button', { name: 'Back to summary' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Train clearly. Know what improved.')).toBeVisible();

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await openFixture(page, 'final-item');
  await page.getByRole('radio', { name: 'Verified answer' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Correct', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View results' })).toBeVisible();
});

test('E01 three misses stops only after third feedback', async ({ page }) => {
  await openFixture(page, 'three-misses');
  for (let miss = 1; miss <= 3; miss += 1) {
    await page.getByRole('radio', { name: 'Wrong option' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Incorrect', { exact: true })).toBeVisible();
    if (miss < 3) await page.getByRole('button', { name: 'Next question' }).click();
  }
  await expect(page.getByRole('button', { name: 'View results' })).toBeVisible();
  await expect(page.getByText('must-not-open')).toHaveCount(0);
  await page.getByRole('button', { name: 'View results' }).click();
  await expect(page.getByText('3', { exact: true })).toBeVisible();
});

test('E02 long-case notes and draft survive reload and resume', async ({ page }) => {
  await openFixture(page, 'long-case');
  await expect(page.getByText(/Constraints: every analyst/)).toBeVisible();
  await page.getByLabel('Scratchpad notes').fill('A cannot use Lab 2; preserve this note.');
  await page.getByRole('radio', { name: 'Verified answer' }).click();
  const longPrompt = page.getByText(/Long case\. Constraints:/);
  await longPrompt.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 600);
  await expect(longPrompt).toHaveCount(1);
  await expect(page.getByRole('radio', { name: 'Verified answer' })).toBeChecked();
  await page.reload();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByLabel('Scratchpad notes')).toHaveValue('A cannot use Lab 2; preserve this note.');
  await expect(page.getByRole('radio', { name: 'Verified answer' })).toBeChecked();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Correct', { exact: true })).toBeVisible();
});

test('E03 visible mode controls persist the selected pace and tier', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start practice' }).click();
  for (const pace of ['Fast', 'Slow']) {
    for (const tier of ['Easy', 'Medium', 'Hard']) {
      await page.getByRole('radio', { name: pace, exact: true }).click();
      await page.getByRole('radio', { name: tier, exact: true }).click();
      await expect(page.getByRole('radio', { name: pace, exact: true })).toBeChecked();
      await expect(page.getByRole('radio', { name: tier, exact: true })).toBeChecked();
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByText(pace === 'Fast' ? 'Short, focused practice' : 'Take time to reason')).toBeVisible();
      await expect(page.getByText(new RegExp(`prepared items · ${tier.toLowerCase()} · 8 categories`))).toBeVisible();
      await page.getByRole('button', { name: 'Close session' }).click();
      await expect(page.getByText('Train clearly. Know what improved.')).toBeVisible();
      await page.getByRole('button', { name: 'Start practice' }).click();
    }
  }
  await page.reload();
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('radio', { name: 'Slow', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Hard', exact: true })).toBeChecked();
});

test('E04 corrupt isolated browser storage produces a visible recovery error', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('puzzle-scroll-progress', '{not-json'));
  await page.goto('/');
  await expect(page.getByText('Progress could not be loaded')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText(/JSON|Unexpected|position/i);
});

test('E04 blocked browser writes remain visible instead of reporting a save', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === 'puzzle-scroll-progress') throw new DOMException('storage blocked', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.getByRole('radio', { name: 'Slow' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('alert')).toContainText(/storage blocked/i);
});

test('E05/E06 app shell works offline and cache deletion stays app-scoped', async ({ context, page }) => {
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.getByText('Train clearly. Know what improved.')).toBeVisible();
  await page.evaluate(async () => {
    await caches.open('puzzle-scroll-v-old');
    await caches.open('sentinel-unrelated-cache');
  });
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  });
  await page.close();
  const updatedPage = await context.newPage();
  await updatedPage.goto('/');
  await updatedPage.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => updatedPage.evaluate(async () => await caches.keys())).not.toContain('puzzle-scroll-v-old');
  expect(await updatedPage.evaluate(async () => await caches.keys())).toContain('sentinel-unrelated-cache');
  await updatedPage.goto('/?__e2e=final-item');
  await expect(updatedPage.getByText('Before you begin')).toBeVisible();
  await updatedPage.getByRole('button', { name: 'Start', exact: true }).click();
  await context.setOffline(true);
  await updatedPage.getByRole('radio', { name: 'Wrong option' }).click();
  await updatedPage.getByRole('button', { name: 'Submit' }).click();
  await expect(updatedPage.getByText('Incorrect', { exact: true })).toBeVisible();
  await updatedPage.reload();
  await expect(updatedPage.getByText('Paused', { exact: true })).toBeVisible();
  await updatedPage.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(updatedPage.getByText('Incorrect', { exact: true })).toBeVisible();
  await expect(updatedPage.getByRole('button', { name: 'View results' })).toBeVisible();
  const missing = await updatedPage.evaluate(async () => {
    const response = await fetch('/missing-e2e-script.js');
    return { status: response.status, text: await response.text(), type: response.headers.get('content-type') };
  });
  expect(missing.status).toBe(504);
  expect(missing.text).not.toContain('<!DOCTYPE html>');
  await context.setOffline(false);
});
