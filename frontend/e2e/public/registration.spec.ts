import { test, expect } from '@playwright/test';
import { getFirstOpenWorkshopId } from '../helpers/api';

test.describe('Public — registration', () => {
  test('submit registration when an open workshop exists', async ({ page, request }) => {
    const workshopId = await getFirstOpenWorkshopId(request);
    test.skip(!workshopId, 'No open workshop — set one workshop status to "open" in admin');

    const unique = `e2e-${Date.now()}@example.test`;

    await page.goto(`/register/${workshopId}`);
    await expect(page.getByRole('heading', { name: /^register$/i })).toBeVisible();

    await page.locator('input[name="name"]').fill('E2E Test User');
    await page.locator('input[name="email"]').fill(unique);
    await page.locator('input[name="phone"]').fill('+92 300 1234567');
    await page.locator('input[name="universityOrg"]').fill('Test University');
    await page.locator('input[name="linkedin"]').fill('https://linkedin.com/in/e2e-test');
    await page.locator('input[name="cnic"]').fill('12345-1234567-1');
    await page.locator('select[name="gender"]').selectOption('Male');
    await page.locator('select[name="definesYouBest"]').selectOption('Student');
    await page.getByPlaceholder(/motivates you to attend/i).fill('Playwright E2E registration flow.');

    await page.getByRole('button', { name: /^register$/i }).click();

    await expect(page.getByRole('heading', { name: /registration submitted/i })).toBeVisible();
    await expect(page.getByText(/shortlisted/i)).toBeVisible();
  });
});
