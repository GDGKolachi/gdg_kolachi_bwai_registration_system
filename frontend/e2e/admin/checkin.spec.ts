import { test, expect } from '@playwright/test';

test.describe('Admin — check-in', () => {
  test('heading and search controls', async ({ page }) => {
    await page.goto('/admin/checkin');
    await expect(page.getByRole('heading', { name: /day-of check-in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search by name or email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^search$/i })).toBeVisible();
  });
});
