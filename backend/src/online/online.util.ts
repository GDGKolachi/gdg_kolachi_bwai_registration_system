/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- untyped request bodies */
import { createHmac, timingSafeEqual } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { isURL } from 'class-validator';
import { siteOrigin } from '../credits/credits.util';

/** Attendees can self check-in from this many minutes before the start... */
export const CHECKIN_OPENS_MINUTES_BEFORE = 15;
/** ...until this many minutes after it. */
export const CHECKIN_CLOSES_MINUTES_AFTER = 240;

/**
 * Event date/time are stored as wall-clock strings ("2026-10-31", "19:00").
 * They are read in EVENT_UTC_OFFSET (default +05:00, Pakistan has no DST).
 */
export function utcOffset(
  raw: string | undefined = process.env.EVENT_UTC_OFFSET,
): string {
  return raw && /^[+-]\d{2}:\d{2}$/.test(raw) ? raw : '+05:00';
}

export function timezoneLabel(
  raw: string | undefined = process.env.EVENT_TIMEZONE_LABEL,
): string {
  return raw?.trim() || 'PKT';
}

/** "19:00", "7:00 PM", "7 pm" or "10:00 AM - 1:00 PM" (first time wins) -> [hours, minutes]. */
export function parseTime(
  time: string | null | undefined,
): [number, number] | null {
  const m = (time || '').trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ampm = m[3]?.toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return [h, min];
}

/** The event's start as an instant, or null when date/time cannot be read. */
export function eventStartsAt(
  date: string,
  time: string,
  offset = utcOffset(),
): Date | null {
  const t = parseTime(time);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  const hh = String(t[0]).padStart(2, '0');
  const mm = String(t[1]).padStart(2, '0');
  const d = new Date(`${date}T${hh}:${mm}:00${offset}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "19:00" -> "7:00 PM". Anything unreadable is returned unchanged. */
export function formatTime12h(time: string): string {
  const t = parseTime(time);
  if (!t) return time;
  const [h, m] = t;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Saturday, 31 October 2026 · 7:00 PM PKT" */
export function formatStart(date: string, time: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date || '')
    ? new Date(`${date}T00:00:00Z`)
    : null;
  const day = d
    ? d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : date;
  return `${day} · ${formatTime12h(time)} ${timezoneLabel()}`;
}

export type CheckinState = 'not_open' | 'open' | 'closed' | 'unknown';

export function checkinWindow(startsAt: Date | null, now = new Date()) {
  if (!startsAt)
    return { state: 'open' as CheckinState, opens_at: null, closes_at: null };
  const opens = new Date(
    startsAt.getTime() - CHECKIN_OPENS_MINUTES_BEFORE * 60_000,
  );
  const closes = new Date(
    startsAt.getTime() + CHECKIN_CLOSES_MINUTES_AFTER * 60_000,
  );
  const state: CheckinState =
    now < opens ? 'not_open' : now > closes ? 'closed' : 'open';
  return { state, opens_at: opens, closes_at: closes };
}

// ------------------------------------------------------------ join links

function secret(): string {
  return (
    process.env.ONLINE_JOIN_SECRET ||
    process.env.JWT_SECRET ||
    'dev-online-join-secret'
  );
}

function sign(registrationId: string): string {
  return createHmac('sha256', secret())
    .update(`online-join:${registrationId}`)
    .digest('base64url')
    .slice(0, 22);
}

/**
 * Personal join link token: "<registration id>.<signature>". Signed rather
 * than stored, so every registration has one without a migration, and it
 * cannot be forged from a registration id alone.
 */
export function joinToken(registrationId: string): string {
  return `${registrationId}.${sign(registrationId)}`;
}

export function verifyJoinToken(token: string): string | null {
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{22})$/i.exec(token || '');
  if (!m) return null;
  const expected = Buffer.from(sign(m[1]));
  const given = Buffer.from(m[2]);
  return expected.length === given.length && timingSafeEqual(expected, given)
    ? m[1]
    : null;
}

export function joinUrl(registrationId: string): string {
  return `${siteOrigin()}/join/${joinToken(registrationId)}`;
}

/**
 * Same job as normalizeCreditsFields, for the meeting fields: PATCH bodies are
 * Partial<CreateEventDto>, which the ValidationPipe cannot check.
 */
export function normalizeMeetingFields<T extends Record<string, any>>(
  data: T,
): T {
  if ('meeting_url' in data && data.meeting_url !== undefined) {
    const v = data.meeting_url;
    if (v === null || (typeof v === 'string' && v.trim() === '')) {
      (data as any).meeting_url = null;
    } else if (
      typeof v !== 'string' ||
      !isURL(v.trim(), { protocols: ['https'], require_protocol: true })
    ) {
      throw new BadRequestException('meeting_url must be a valid https URL');
    } else {
      (data as any).meeting_url = v.trim();
    }
  }
  if ('meeting_details' in data && typeof data.meeting_details === 'string') {
    (data as any).meeting_details = data.meeting_details.trim() || null;
  }
  if (
    'meeting_reminder_minutes' in data &&
    data.meeting_reminder_minutes !== undefined
  ) {
    const n = Number(data.meeting_reminder_minutes);
    if (!Number.isInteger(n) || n < 5 || n > 240) {
      throw new BadRequestException(
        'meeting_reminder_minutes must be a whole number between 5 and 240',
      );
    }
    (data as any).meeting_reminder_minutes = n;
  }
  if (
    'meeting_reminder_enabled' in data &&
    data.meeting_reminder_enabled !== undefined &&
    typeof data.meeting_reminder_enabled !== 'boolean'
  ) {
    throw new BadRequestException('meeting_reminder_enabled must be a boolean');
  }
  return data;
}
