import path from 'path';
import { fileURLToPath } from 'url';
import { test as setup, expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth', 'admin.json');

setup('authenticate admin', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL || 'admin@gdgkolachi.com';
  const password = process.env.E2E_ADMIN_PASSWORD || 'admin123';

  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/admin\/?$/);
  await expect(page.getByRole('heading', { name: /^dashboard$/i })).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: authFile });
});
