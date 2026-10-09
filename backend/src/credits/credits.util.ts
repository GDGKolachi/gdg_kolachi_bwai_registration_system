/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- raw SQL rows and untyped request bodies */
import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { isURL } from 'class-validator';

/** Attempts (including the first) before a retryable failure becomes `failed`. */
export const MAX_EMAIL_ATTEMPTS = 5;

/** Delays before attempt 2, 3, 4 and 5: 15 s, 1 min, 5 min, 15 min. */
const BACKOFF_MS = [15_000, 60_000, 5 * 60_000, 15 * 60_000];

/**
 * Delay before the next attempt once `attemptsMade` attempts have failed
 * retryably, or null when the budget is spent and the row should be `failed`.
 */
export function backoffMs(attemptsMade: number): number | null {
  if (attemptsMade < 1 || attemptsMade > BACKOFF_MS.length) return null;
  return BACKOFF_MS[attemptsMade - 1];
}

/** 32 random bytes, base64url (43 chars, no padding). Unguessable, unlike the registration id. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Site origin derived from APP_URL exactly as email.service.ts does: a trailing
 * `/api` or `/` is stripped. Duplicated on purpose (email.service.ts is not touched).
 */
export function siteOrigin(
  appUrl: string | undefined = process.env.APP_URL,
): string {
  return (appUrl || 'http://localhost:3000')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '');
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sends per second, from CREDITS_EMAIL_PER_SECOND (default 4). */
export function emailsPerSecond(
  raw: string | undefined = process.env.CREDITS_EMAIL_PER_SECOND,
): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

const CREDITS_URL_FIELDS = ['credits_claim_url', 'credits_video_url'] as const;

/**
 * Normalises and validates the credits URL fields of an event payload in place:
 * '' / null clear the value, anything else must be an https URL.
 *
 * The admin PATCH endpoints take `Partial<CreateEventDto>`, which the global
 * ValidationPipe cannot validate (Partial erases the class metadata), so the
 * DTO decorators alone would not protect updates.
 */
export function normalizeCreditsFields<T extends Record<string, any>>(
  data: T,
): T {
  for (const field of CREDITS_URL_FIELDS) {
    if (!(field in data)) continue;
    const value = data[field];
    if (value === undefined) continue;
    if (value === null || (typeof value === 'string' && value.trim() === '')) {
      (data as any)[field] = null;
      continue;
    }
    if (
      typeof value !== 'string' ||
      !isURL(value.trim(), { protocols: ['https'], require_protocol: true })
    ) {
      throw new BadRequestException(`${field} must be a valid https URL`);
    }
    (data as any)[field] = value.trim();
  }
  if (
    'credits_enabled' in data &&
    data.credits_enabled !== undefined &&
    typeof data.credits_enabled !== 'boolean'
  ) {
    throw new BadRequestException('credits_enabled must be a boolean');
  }
  return data;
}

/** Upper bound for one Resend call; Node's fetch would otherwise wait ~300 s. */
export const RESEND_TIMEOUT_MS = 15000;

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`timeout after ${ms}ms`);
  }
}

/** Resolves/rejects with `promise`, or rejects with TimeoutError after `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
