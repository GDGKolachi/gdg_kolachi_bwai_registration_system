import { BadRequestException } from '@nestjs/common';
import {
  MAX_EMAIL_ATTEMPTS,
  backoffMs,
  emailsPerSecond,
  escapeHtml,
  generateToken,
  normalizeCreditsFields,
  siteOrigin,
} from './credits.util';

describe('backoffMs', () => {
  it('follows 15s / 1m / 5m / 15m then gives up', () => {
    expect(backoffMs(1)).toBe(15_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(300_000);
    expect(backoffMs(4)).toBe(900_000);
    expect(backoffMs(5)).toBeNull();
    expect(backoffMs(0)).toBeNull();
  });

  it('allows five attempts in total', () => {
    expect(MAX_EMAIL_ATTEMPTS).toBe(5);
  });
});

describe('generateToken', () => {
  it('is 43 chars of base64url (32 bytes) and unique', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(Buffer.from(a, 'base64url')).toHaveLength(32);
  });
});

describe('siteOrigin', () => {
  it('strips a trailing /api or slash', () => {
    expect(siteOrigin('https://register.example.test/api')).toBe('https://register.example.test');
    expect(siteOrigin('https://register.example.test/api/')).toBe('https://register.example.test');
    expect(siteOrigin('https://register.example.test/')).toBe('https://register.example.test');
    expect(siteOrigin('https://register.example.test')).toBe('https://register.example.test');
  });

  it('falls back to localhost when APP_URL is unset', () => {
    expect(siteOrigin('')).toBe('http://localhost:3000');
  });
});

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;',
    );
  });

  it('tolerates null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('emailsPerSecond', () => {
  it('defaults to 4 and ignores nonsense', () => {
    expect(emailsPerSecond(undefined)).toBe(4);
    expect(emailsPerSecond('abc')).toBe(4);
    expect(emailsPerSecond('0')).toBe(4);
    expect(emailsPerSecond('20')).toBe(20);
  });
});

describe('normalizeCreditsFields', () => {
  it('clears empty values and accepts https', () => {
    const data: any = { credits_claim_url: '  ', credits_video_url: 'https://youtu.be/abc' };
    normalizeCreditsFields(data);
    expect(data.credits_claim_url).toBeNull();
    expect(data.credits_video_url).toBe('https://youtu.be/abc');
  });

  it('rejects non-https URLs', () => {
    expect(() => normalizeCreditsFields({ credits_claim_url: 'http://example.com' })).toThrow(BadRequestException);
    expect(() => normalizeCreditsFields({ credits_video_url: 'javascript:alert(1)' })).toThrow(BadRequestException);
    expect(() => normalizeCreditsFields({ credits_claim_url: 42 })).toThrow(BadRequestException);
  });

  it('leaves unrelated payloads alone', () => {
    const data: any = { title: 'x' };
    expect(normalizeCreditsFields(data)).toEqual({ title: 'x' });
  });
});
