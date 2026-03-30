import { test, expect } from '@playwright/test';
import { getFirstWorkshopId } from '../helpers/api';

test.describe('Public — exception request', () => {
  test('form loads for an existing workshop', async ({ page, request }) => {
    const workshopId = await getFirstWorkshopId(request);
    test.skip(!workshopId, 'No workshops in API');

    await page.goto(`/exception-request/${workshopId}`);
    await expect(page.getByRole('heading', { name: /^exception request$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /submit exception request/i })).toBeVisible();
  });
});
