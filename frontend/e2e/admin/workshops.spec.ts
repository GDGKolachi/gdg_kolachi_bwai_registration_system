import { test, expect } from '@playwright/test';

test.describe('Admin — workshops', () => {
  test('list and open create modal', async ({ page }) => {
    await page.goto('/admin/workshops');
    await expect(page.getByRole('heading', { name: /^workshops$/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /new workshop/i }).click();
    await expect(page.getByRole('heading', { name: /create workshop/i })).toBeVisible();
    await page.getByRole('button', { name: /^cancel$/i }).click();
  });
});
