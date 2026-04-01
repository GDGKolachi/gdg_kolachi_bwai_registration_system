import { test, expect } from '@playwright/test';

test.describe('Admin — registrations', () => {
  test('page and workshop selector', async ({ page }) => {
    await page.goto('/admin/registrations');
    await expect(page.getByRole('heading', { name: /^registrations$/i })).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });
});
