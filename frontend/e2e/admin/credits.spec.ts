import { test, expect, type Page } from '@playwright/test';
import {
  adminLoginToken,
  createCreditsEvent,
  registerConfirmedAttendee,
  getCreditsStatus,
  apiOrigin,
} from '../helpers/api';

async function scanByPaste(page: Page, registrationId: string) {
  await page.goto('/admin/qr-scan');
  await page.getByPlaceholder(/paste qr code data/i).fill(JSON.stringify({ registrationId }));
  await page.getByRole('button', { name: /look up/i }).click();
}

test.describe('Admin: Google Cloud credits', () => {
  test('QR scan queues the credits email, shows failed with Retry after the worker runs', async ({ page, request }) => {
    const token = await adminLoginToken(request);
    const event = await createCreditsEvent(request, token);
    const person = await registerConfirmedAttendee(request, token, event.id);

    await scanByPaste(page, person.id);
    await expect(page.getByText(person.email)).toBeVisible();
    await page.getByRole('button', { name: /mark as attended/i }).click();
    // Never acknowledged the spot, so the scanner asks first.
    await page.getByRole('button', { name: 'Allow anyway' }).click();
    await expect(page.getByText('Already checked in')).toBeVisible();

    // Queued right away; there is no RESEND_API_KEY in dev, so it ends up failed.
    const line = page.getByTestId('credits-line');
    await expect(line).toBeVisible();
    await expect(line).toContainText(/Credits email (queued|failed)/);
    await expect(line).toContainText('Credits email failed', { timeout: 30_000 });
    const retry = line.getByRole('button', { name: 'Retry' });
    await expect(retry).toBeVisible();

    // Retry re-queues it, and it fails again once the worker has run.
    await retry.click();
    await expect(line).toContainText('Credits email failed', { timeout: 30_000 });
  });

  test('drawer shows the credits section, QR modal, and volunteer mark-redeemed feeds the grid filter', async ({ page, request }) => {
    const token = await adminLoginToken(request);
    const event = await createCreditsEvent(request, token);
    const person = await registerConfirmedAttendee(request, token, event.id);

    await page.goto('/admin/registrations');
    await page.locator('#reg-event-select').selectOption(event.id);
    await expect(page.getByText(person.name).first()).toBeVisible();

    await page.getByText(person.name).first().click();
    const section = page.getByTestId('credits-section');
    await expect(section).toBeVisible();
    await expect(section.getByTestId('credits-email-badge')).toContainText('Not sent');

    // Show credits QR
    await section.getByRole('button', { name: 'Show credits QR' }).click();
    const modal = page.getByRole('dialog', { name: 'Credits QR' });
    await expect(modal.getByRole('img', { name: /credits confirmation qr/i })).toBeVisible();
    await expect(modal.getByText(/\/credits\/[A-Za-z0-9_-]{20,}/)).toBeVisible();
    await expect(modal.getByText('Ask the attendee to scan this with their phone')).toBeVisible();
    await modal.getByRole('button', { name: 'Done' }).click();

    // Mark redeemed (volunteer confirmed)
    await section.getByRole('button', { name: 'Mark redeemed' }).click();
    await expect(page.getByText("Only do this after you've seen the GDP Credit billing account on their screen.")).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Mark redeemed' }).click();
    await expect(section.getByText(/confirmed by volunteer/i).first()).toBeVisible();
    await expect(section.getByRole('button', { name: 'Undo' })).toBeVisible(); // super admin is an organizer
    expect((await getCreditsStatus(request, token, person.id)).redeemed).toBe(true);

    await page.keyboard.press('Escape');

    // Grid: Credits column + "Redeemed" filter
    await expect(page.getByRole('row', { name: new RegExp(person.name) }).getByText(/Redeemed/)).toBeVisible();
    const creditsFilter = page.locator('label', { hasText: /^Credits$/ }).locator('..').locator('select');
    await creditsFilter.selectOption('not_redeemed');
    await page.getByRole('button', { name: /apply filters/i }).first().click();
    await expect(page.getByText(person.name)).toHaveCount(0);
    await creditsFilter.selectOption('redeemed');
    await page.getByRole('button', { name: /apply filters/i }).first().click();
    await expect(page.getByText(person.name).first()).toBeVisible();
  });

  test('credits page shows summary counts, follow-up list and the projector link', async ({ page, request }) => {
    const token = await adminLoginToken(request);
    const event = await createCreditsEvent(request, token);
    const a = await registerConfirmedAttendee(request, token, event.id);
    const b = await registerConfirmedAttendee(request, token, event.id);
    for (const p of [a, b]) {
      const res = await request.patch(`${apiOrigin()}/api/admin/qr-scan/${p.id}/attend`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok()).toBeTruthy();
    }
    // One volunteer-confirmed redemption.
    await request.post(`${apiOrigin()}/api/admin/credits/registrations/${a.id}/confirm`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    await page.goto('/admin/credits');
    await page.getByLabel('Event').selectOption({ label: event.title });

    await expect(page.getByTestId('stat-checked-in')).toContainText('2');
    await expect(page.getByTestId('stat-redeemed')).toContainText('1');
    await expect(page.getByTestId('stat-redeemed')).toContainText('1 by volunteer');
    await expect(page.getByTestId('stat-pct')).toContainText('50%');

    // Follow-up lists only the one who has not redeemed.
    const table = page.getByTestId('credits-table-not_redeemed');
    await expect(table.getByText(b.name)).toBeVisible();
    await expect(table.getByText(a.name)).toHaveCount(0);

    // Emails fail without an API key; they show under "Email failed" with the error.
    await expect(page.getByTestId('stat-failed')).toContainText('2', { timeout: 40_000 });
    await page.getByRole('tab', { name: 'Email failed' }).click();
    const failed = page.getByTestId('credits-table-failed');
    await expect(failed.getByText(/RESEND_API_KEY is not set/).first()).toBeVisible();
    await expect(failed.getByRole('button', { name: 'Resend' }).first()).toBeVisible();

    // Projector card
    await expect(page.getByTestId('resend-url')).toHaveText(new RegExp(`/credits/resend\\?event=${event.id}$`));
  });
});
