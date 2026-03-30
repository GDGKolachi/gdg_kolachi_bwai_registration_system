import { test, expect } from '@playwright/test';

test.describe('Admin — QR scan', () => {
  test('scanner page and manual input', async ({ page }) => {
    await page.goto('/admin/qr-scan');
    await expect(page.getByRole('heading', { name: /qr code scanner/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /manual qr data input/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /look up/i })).toBeVisible();
  });
});
