import { test, expect } from '@playwright/test';

test.describe('Admin — users', () => {
  test('list heading and new user', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /^users$/i })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: /new user/i }).click();
    await expect(page.getByRole('heading', { name: /create user/i })).toBeVisible();
    await page.getByRole('button', { name: /^cancel$/i }).click();
  });
});
