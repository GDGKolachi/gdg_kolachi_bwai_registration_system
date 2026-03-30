import { test, expect } from '@playwright/test';

test.describe('Public — admin login (unauthenticated)', () => {
  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('input[type="email"]').fill('not-a-real-admin@example.test');
    await page.locator('input[type="password"]').fill('wrong-password-12345');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
