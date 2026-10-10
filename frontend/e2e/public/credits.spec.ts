import { test, expect } from '@playwright/test';
import {
  adminLoginToken,
  createCreditsEvent,
  registerConfirmedAttendee,
  getCreditsConfirmUrl,
} from '../helpers/api';

// The confirm page is opened from a phone, so test it at a phone width.
test.use({ viewport: { width: 375, height: 800 } });

test.describe('Public: Google Cloud credits', () => {
  test('an invalid token shows the invalid-link message', async ({ page }) => {
    await page.goto('/credits/this-is-not-a-real-token');
    await expect(page.getByRole('heading', { name: 'This link is not valid' })).toBeVisible();
  });

  test('confirm page: confirm once and it stays confirmed after a reload', async ({ page, request }) => {
    const token = await adminLoginToken(request);
    const event = await createCreditsEvent(request, token);
    const person = await registerConfirmedAttendee(request, token, event.id, { name: 'Ayesha Khan' });
    const url = await getCreditsConfirmUrl(request, token, person.id);

    await page.goto(url);
    await expect(page.getByText(event.title)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hi Ayesha' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Have you redeemed your Google Cloud credits?' })).toBeVisible();
    await expect(page.getByText('Tap this once you can see the "GDP Credit" billing account in Google Cloud.')).toBeVisible();

    // Fallbacks open in a new tab
    const claim = page.getByRole('link', { name: 'Claim your credits' });
    await expect(claim).toHaveAttribute('target', '_blank');
    await expect(claim).toHaveAttribute('rel', /noopener/);
    await expect(page.getByRole('link', { name: 'Watch the 2-minute walkthrough' })).toHaveAttribute('target', '_blank');

    // No horizontal scroll at 375px
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole('button', { name: "Yes, I've redeemed my credits" }).click();
    await expect(page.getByRole('heading', { name: /You're all set/ })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: /You're all set/ })).toBeVisible();
    await expect(page.getByRole('button', { name: "Yes, I've redeemed my credits" })).toHaveCount(0);
  });

  test('resend page always shows the generic message', async ({ page, request }) => {
    const token = await adminLoginToken(request);
    const event = await createCreditsEvent(request, token);

    // Event from the link
    await page.goto(`/credits/resend?event=${event.id}`);
    await expect(page.getByRole('heading', { name: "Didn't get the email?" })).toBeVisible();
    await page.getByLabel('Email').fill('nobody-registered@example.test');
    await page.getByRole('button', { name: 'Send it again' }).click();
    const message = page.getByTestId('resend-message');
    await expect(message).toContainText("If you're checked in, we've sent the email again.");

    // No event in the link: pick one from the list
    await page.goto('/credits/resend');
    await page.getByLabel('Event').selectOption({ label: event.title });
    await page.getByLabel('Email').fill('another@example.test');
    await page.getByRole('button', { name: 'Send it again' }).click();
    await expect(page.getByTestId('resend-message')).toContainText("If you're checked in, we've sent the email again.");
  });
});
