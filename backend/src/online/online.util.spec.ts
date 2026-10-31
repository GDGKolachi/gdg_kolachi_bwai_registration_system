import {
  checkinWindow,
  eventStartsAt,
  formatStart,
  formatTime12h,
  joinToken,
  normalizeMeetingFields,
  parseTime,
  verifyJoinToken,
} from './online.util';
import {
  meetingReminderSubject,
  renderMeetingReminderEmail,
} from './online-email.template';

const REG = '3f2c1a9e-8b7d-4c6e-9f10-1a2b3c4d5e6f';

describe('online.util', () => {
  it('reads 24h, 12h and range times', () => {
    expect(parseTime('19:00')).toEqual([19, 0]);
    expect(parseTime('7:30 PM')).toEqual([19, 30]);
    expect(parseTime('12 am')).toEqual([0, 0]);
    expect(parseTime('10:00 AM - 1:00 PM')).toEqual([10, 0]);
    expect(parseTime('soon')).toBeNull();
  });

  it('turns wall-clock date/time into an instant in the event offset', () => {
    expect(eventStartsAt('2026-10-31', '19:00', '+05:00')?.toISOString()).toBe(
      '2026-10-31T14:00:00.000Z',
    );
    expect(eventStartsAt('31/10/2026', '19:00')).toBeNull();
  });

  it('formats times for emails', () => {
    expect(formatTime12h('19:00')).toBe('7:00 PM');
    expect(formatTime12h('00:15')).toBe('12:15 AM');
    expect(formatStart('2026-10-31', '19:00')).toBe(
      'Saturday, 31 October 2026 · 7:00 PM PKT',
    );
  });

  it('opens check-in 15 minutes before and closes 4 hours after the start', () => {
    const start = new Date('2026-10-31T14:00:00Z');
    expect(checkinWindow(start, new Date('2026-10-31T13:40:00Z')).state).toBe(
      'not_open',
    );
    expect(checkinWindow(start, new Date('2026-10-31T13:50:00Z')).state).toBe(
      'open',
    );
    expect(checkinWindow(start, new Date('2026-10-31T17:59:00Z')).state).toBe(
      'open',
    );
    expect(checkinWindow(start, new Date('2026-10-31T18:01:00Z')).state).toBe(
      'closed',
    );
  });

  it('signs join tokens and rejects tampered ones', () => {
    const token = joinToken(REG);
    expect(verifyJoinToken(token)).toBe(REG);
    expect(verifyJoinToken(`${REG}.${'a'.repeat(22)}`)).toBeNull();
    const other = '3f2c1a9e-8b7d-4c6e-9f10-1a2b3c4d5e60';
    expect(verifyJoinToken(`${other}.${token.split('.')[1]}`)).toBeNull();
    expect(verifyJoinToken('nonsense')).toBeNull();
  });

  it('validates meeting fields on partial updates', () => {
    expect(normalizeMeetingFields({ meeting_url: '' }).meeting_url).toBeNull();
    expect(
      normalizeMeetingFields({ meeting_url: ' https://meet.google.com/abc ' })
        .meeting_url,
    ).toBe('https://meet.google.com/abc');
    expect(() =>
      normalizeMeetingFields({ meeting_url: 'http://x.com' }),
    ).toThrow();
    expect(() =>
      normalizeMeetingFields({ meeting_reminder_minutes: 2 }),
    ).toThrow();
  });
});

describe('meeting reminder email', () => {
  const base = {
    name: 'Ayesha <b>',
    eventTitle: 'Forward Deployed',
    startsAtText: 'Saturday, 31 October 2026 · 7:00 PM PKT',
    minutesUntilStart: 30,
    joinUrl: 'https://example.com/join/abc',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    meetingDetails: 'Passcode: 1234',
    creditsEnabled: true,
  };

  it('picks the subject from the time left', () => {
    expect(meetingReminderSubject('X', 30)).toBe(
      '⏰ Starting in 30 minutes: X',
    );
    expect(meetingReminderSubject('X', 0)).toBe('🔴 Starting now: X');
    expect(meetingReminderSubject('X', 600)).toBe('🔔 Reminder: X');
  });

  it('contains the join link, meeting details and credits note, escaped', () => {
    const { html, text } = renderMeetingReminderEmail(base);
    expect(html).toContain('https://example.com/join/abc');
    expect(html).toContain('Passcode: 1234');
    expect(html).toContain('Google Cloud credits');
    expect(html).toContain('Ayesha &lt;b&gt;');
    expect(html).not.toContain('Ayesha <b>');
    expect(text).toContain(
      'Check in & join the session: https://example.com/join/abc',
    );
  });

  it('leaves the credits note out when credits are off', () => {
    expect(
      renderMeetingReminderEmail({ ...base, creditsEnabled: false }).html,
    ).not.toContain('Google Cloud credits');
  });
});
