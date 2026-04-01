import { test, expect } from '@playwright/test';
import { getFirstWorkshopId } from '../helpers/api';

test.describe('Public — workshops', () => {
  test('home page shows series title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /build with ai/i })).toBeVisible();
  });

  test('workshop list or empty state', async ({ page }) => {
    await page.goto('/');
    const hasCards = await page.getByRole('link', { name: 'Details' }).first().isVisible().catch(() => false);
    const empty = await page.getByText(/no workshops available/i).isVisible().catch(() => false);
    expect(hasCards || empty).toBeTruthy();
  });

  test('workshop detail from Details link', async ({ page, request }) => {
    const id = await getFirstWorkshopId(request);
    test.skip(!id, 'No workshops in API — seed data or start backend');

    await page.goto('/');
    await page.getByRole('link', { name: 'Details' }).first().click();
    await expect(page.getByRole('link', { name: /back to workshops/i })).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
