import { test, expect } from '@playwright/test';

test.describe('Admin — exceptions', () => {
  test('queue heading', async ({ page }) => {
    await page.goto('/admin/exceptions');
    await expect(page.getByRole('heading', { name: /exception requests/i })).toBeVisible({ timeout: 30_000 });
  });
});
