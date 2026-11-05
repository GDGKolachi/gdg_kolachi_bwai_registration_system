import { siteOrigin } from '../../credits/credits.util';
import {
  formatTime12h,
  timezoneLabel,
  utcOffset,
} from '../../online/online.util';

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function firstNameOf(fullName: string | null | undefined): string {
  return (fullName || '').trim().split(/\s+/)[0] || 'there';
}

/** "2026-10-31" -> "Saturday, 31 October 2026". Anything else is returned unchanged. */
export function formatEventDate(date: string | null | undefined): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || '';
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatEventTime(time: string | null | undefined): string {
  return time ? formatTime12h(time) : '';
}

/** An instant in the event time zone: "Sat, 7 Nov 2026, 7:00 PM PKT". */
export function formatInstant(value: Date | string | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const [, sign, hh, mm] = /^([+-])(\d{2}):(\d{2})$/.exec(utcOffset()) || [
    '',
    '+',
    '05',
    '00',
  ];
  const offsetMs =
    (sign === '-' ? -1 : 1) * (Number(hh) * 60 + Number(mm)) * 60_000;
  const local = new Date(d.getTime() + offsetMs);
  const day = local.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const time = local.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  return `${day}, ${time} ${timezoneLabel()}`;
}

export const PUBLIC_SITE_FALLBACK = 'https://register.gdgkolachi.com';

/**
 * Where email images are served from. Images must be reachable from any inbox,
 * so a localhost APP_URL is never used: EMAIL_ASSET_BASE_URL wins, then a
 * public APP_URL, then the production site.
 */
export function emailAssetBase(): string {
  const explicit = process.env.EMAIL_ASSET_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const origin = siteOrigin();
  return /localhost|127\.0\.0\.1/.test(origin) ? PUBLIC_SITE_FALLBACK : origin;
}

/**
 * Plain-text part derived from the rendered HTML, so the two never drift.
 * Links keep their URL in brackets; the hidden preheader is dropped.
 */
export function htmlToText(html: string): string {
  let s = html
    .replace(/<!--preheader-->[\s\S]*?<!--\/preheader-->/g, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(
      /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_m, href: string, label: string) => {
        const text = label.replace(/<[^>]+>/g, '').trim();
        const url = href.replace(/&amp;/g, '&');
        if (!text) return '';
        return text === url || text.replace(/&amp;/g, '&') === url
          ? url
          : `${text} (${url})`;
      },
    )
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|table|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&middot;/g, '·')
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
  return s
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
