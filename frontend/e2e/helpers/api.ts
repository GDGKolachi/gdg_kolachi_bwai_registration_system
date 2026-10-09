import type { APIRequestContext } from '@playwright/test';

/** API origin (Nest uses global prefix /api). */
export function apiOrigin(): string {
  return process.env.PLAYWRIGHT_API_URL || 'http://localhost:3000';
}

export async function getFirstOpenWorkshopId(request: APIRequestContext): Promise<string | null> {
  const res = await request.get(`${apiOrigin()}/api/workshops`);
  if (!res.ok()) return null;
  const list = (await res.json()) as { id: string; status?: string }[];
  if (!Array.isArray(list)) return null;
  const open = list.find((w) => w.status === 'open');
  return open?.id ?? null;
}

export async function getFirstWorkshopId(request: APIRequestContext): Promise<string | null> {
  const res = await request.get(`${apiOrigin()}/api/workshops`);
  if (!res.ok()) return null;
  const list = (await res.json()) as { id: string }[];
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[0].id;
}

// ---------------------------------------------------------------------------
// Google Cloud credits helpers. They talk to the real API with an admin token,
// and use unique titles / emails / CNICs per run so reruns never collide.
// ---------------------------------------------------------------------------

export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export async function adminLoginToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${apiOrigin()}/api/auth/login`, {
    data: {
      email: process.env.E2E_ADMIN_EMAIL || 'admin@gdgkolachi.com',
      password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
    },
  });
  if (!res.ok()) throw new Error(`admin login failed: ${res.status()}`);
  return (await res.json()).access_token as string;
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface CreditsEvent {
  id: string;
  title: string;
}

/** Creates an open workshop with the credits email switched on. */
export async function createCreditsEvent(
  request: APIRequestContext,
  token: string,
  opts: { title?: string; enabled?: boolean; claimUrl?: string; videoUrl?: string | null } = {},
): Promise<CreditsEvent> {
  const typesRes = await request.get(`${apiOrigin()}/api/event-types`);
  const types = (await typesRes.json()) as { id: string; slug: string }[];
  const workshop = types.find((t) => t.slug === 'workshop') ?? types[0];
  const title = opts.title ?? `Credits E2E ${uniqueSuffix()}`;
  const res = await request.post(`${apiOrigin()}/api/admin/events`, {
    headers: authHeader(token),
    data: {
      event_type_id: workshop.id,
      title,
      description: 'Credits e2e event',
      date: '2026-12-01',
      time: '10:00',
      venue: 'Karachi',
      max_capacity: 500,
      status: 'open',
      credits_enabled: opts.enabled ?? true,
      credits_claim_url: opts.claimUrl ?? 'https://cloud.google.com/claim-credits-e2e',
      credits_video_url: opts.videoUrl === undefined ? 'https://www.youtube.com/watch?v=e2e' : opts.videoUrl,
    },
  });
  if (!res.ok()) throw new Error(`create event failed: ${res.status()} ${await res.text()}`);
  return { id: (await res.json()).id as string, title };
}

export interface SeededAttendee {
  id: string; // registration id
  name: string;
  email: string;
}

let cnicSeq = Math.floor(Math.random() * 1_000_000);

/** Registers an attendee through the public API and moves them to `confirmed` (never `shortlisted`: that sends mail). */
export async function registerConfirmedAttendee(
  request: APIRequestContext,
  token: string,
  eventId: string,
  opts: { name?: string; email?: string } = {},
): Promise<SeededAttendee> {
  const suffix = uniqueSuffix();
  const name = opts.name ?? `Credits Tester ${suffix}`;
  const email = opts.email ?? `credits-${suffix}@example.test`;
  cnicSeq += 1;
  const cnic = `42101-${String(cnicSeq % 10_000_000).padStart(7, '0')}-${cnicSeq % 10}`;
  const res = await request.post(`${apiOrigin()}/api/registrations`, {
    data: {
      name,
      email,
      phone: '03001234567',
      university_org: 'NED University',
      linkedin: 'https://linkedin.com/in/e2e',
      cnic,
      gender: 'Male',
      best_describes_you: 'Student',
      motivation: 'Credits e2e',
      event_id: eventId,
    },
  });
  if (!res.ok()) throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  const id = (await res.json()).id as string;
  const status = await request.patch(`${apiOrigin()}/api/admin/registrations/status`, {
    headers: authHeader(token),
    data: { ids: [id], status: 'confirmed' },
  });
  if (!status.ok()) throw new Error(`status change failed: ${status.status()} ${await status.text()}`);
  return { id, name, email };
}

/** The attendee-facing confirm URL (this also creates the unsent credits row). */
export async function getCreditsConfirmUrl(
  request: APIRequestContext,
  token: string,
  registrationId: string,
): Promise<string> {
  const res = await request.get(`${apiOrigin()}/api/admin/credits/registrations/${registrationId}/qr`, {
    headers: authHeader(token),
  });
  if (!res.ok()) throw new Error(`credits qr failed: ${res.status()}`);
  return (await res.json()).confirm_url as string;
}

export async function getCreditsStatus(
  request: APIRequestContext,
  token: string,
  registrationId: string,
): Promise<{ email_status: string; redeemed: boolean }> {
  const res = await request.get(`${apiOrigin()}/api/admin/credits/registrations/${registrationId}`, {
    headers: authHeader(token),
  });
  return res.json();
}
