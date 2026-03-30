import { test, expect } from '@playwright/test';

test.describe('Admin — dashboard', () => {
  test('overview heading and stats', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/total workshops/i)).toBeVisible();
  });
});
