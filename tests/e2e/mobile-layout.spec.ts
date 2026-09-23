import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

test('E07 final feedback and exits fit each supported mobile viewport', async ({ page }, testInfo) => {
  await page.goto('/?__e2e=final-item');
  await expect(page.getByText('Before you begin')).toBeVisible();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('radio', { name: 'Wrong option' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  for (const control of [
    page.getByRole('button', { name: 'Close session' }),
    page.getByRole('button', { name: 'View results' })
  ]) {
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(testInfo.project.use.viewport!.width);
  }
  const evidenceDir = join(process.cwd(), 'docs', 'implementation', 'evidence');
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, `final-feedback-${testInfo.project.name}.png`) });
});
