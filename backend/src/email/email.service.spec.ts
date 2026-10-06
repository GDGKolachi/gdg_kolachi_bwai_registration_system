import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

Logger.overrideLogger(false);

// A Resend stand-in that records every message instead of sending it.
function fakeResend(fail: (to: string) => string | null = () => null) {
  const sent: any[] = [];
  return {
    sent,
    emails: {
      send: jest.fn(async (msg: any) => {
        sent.push(msg);
        const reason = fail(msg.to[0]);
        return reason ? { data: null, error: { message: reason } } : { data: { id: `id-${sent.length}` }, error: null };
      }),
    },
    batch: { send: jest.fn() },
  };
}

function serviceWith(resend: unknown): EmailService {
  const prev = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const svc = new EmailService();
  process.env.RESEND_API_KEY = prev;
  (svc as any).resend = resend;
  (svc as any).logger = { log: () => {}, warn: () => {}, error: () => {} };
  (svc as any).retryDelayMs = 0;
  return svc;
}

const talk = {
  title: 'Beyond Intelligence 2026',
  date: '2026-10-10',
  time: '12:00',
  venue: 'CEGA, Karachi',
  is_online: false,
};

const hostileNames = [
  '<a href="https://evil.example/login">Verify your account</a>',
  'Ali "The Dev" Khan',
  "O'Brien & Sons <script>alert(1)</script>",
];

describe('event dates and times in emails', () => {
  const svc = serviceWith(undefined);

  it.each([
    ['2026-10-10', 'Saturday, 10 October 2026'],
    ['2026-12-31', 'Thursday, 31 December 2026'],
    ['2024-02-29', 'Thursday, 29 February 2024'],
    ['2027-01-01', 'Friday, 1 January 2027'],
  ])('shows %s as "%s"', (date, expected) => {
    expect(svc.formatEventDate(date)).toBe(expected);
  });

  it.each([
    ['00:00', '12:00 AM'],
    ['00:15', '12:15 AM'],
    ['09:30', '9:30 AM'],
    ['11:59', '11:59 AM'],
    ['12:00', '12:00 PM'],
    ['12:30:00', '12:30 PM'],
    ['21:30', '9:30 PM'],
    ['23:59', '11:59 PM'],
  ])('shows the 24-hour time %s as %s', (time, expected) => {
    expect(svc.formatEventTime(time)).toBe(expected);
  });

  it.each([
    ['TBA', 'TBA'],
    ['', ''],
    ['25:00', '25:00'],
    ['<b>soon</b>', '&lt;b&gt;soon&lt;/b&gt;'],
  ])('shows a time it cannot read (%s) as typed, escaped', (time, expected) => {
    expect(svc.formatEventTime(time)).toBe(expected);
  });

  it('shows a date it cannot read as typed, escaped', () => {
    expect(svc.formatEventDate('10/10/2026')).toBe('10/10/2026');
    expect(svc.formatEventDate(null as any)).toBe('');
  });

  it('shows deadlines in Pakistan time, including across midnight', () => {
    expect(svc.formatPkt(new Date('2026-10-09T18:59:00Z'))).toBe('Friday, 9 October 2026, 11:59 PM PKT');
    expect(svc.formatPkt(new Date('2026-10-09T19:00:00Z'))).toBe('Saturday, 10 October 2026, 12:00 AM PKT');
    expect(svc.formatPkt(new Date('2026-12-31T19:30:00Z'))).toBe('Friday, 1 January 2027, 12:30 AM PKT');
  });
});

describe('shortlist email', () => {
  it('gives the full date and a 12-hour time, with no stray "AM" after the weekday', async () => {
    const resend = fakeResend();
    await serviceWith(resend).sendShortlistedEmail('ayesha@example.com', 'Ayesha', talk, 'reg-1', '{"registrationId":"reg-1"}');
    const html = resend.sent[0].html;
    expect(html).toContain('Saturday, 10 October 2026');
    expect(html).toContain('12:00 PM');
    expect(html).not.toContain(', AM');
  });

  it.each(hostileNames)('escapes HTML in the attendee name %s', async (name) => {
    const resend = fakeResend();
    await serviceWith(resend).sendShortlistedEmail('x@example.com', name, { ...talk, title: 'AI & You <2026>' }, 'reg-1', 'q');
    const html = resend.sent[0].html;
    expect(html).not.toContain(name);
    expect(html).not.toMatch(/<a href="https:\/\/evil|<script>/);
    expect(html).toContain('AI &amp; You &lt;2026&gt;');
  });

  it('keeps Urdu and accented names readable', async () => {
    const resend = fakeResend();
    const svc = serviceWith(resend);
    await svc.sendShortlistedEmail('ali@example.com', 'محمد علی', talk, 'reg-1', 'q');
    await svc.sendShortlistedEmail('zoe@example.com', 'Zoë Çelik', talk, 'reg-2', 'q');
    expect(resend.sent[0].html).toContain('محمد علی');
    expect(resend.sent[1].html).toContain('Zoë Çelik');
  });

  it('copes with a blank name', async () => {
    const resend = fakeResend();
    const result = await serviceWith(resend).sendShortlistedEmail('blank@example.com', '', talk, 'reg-1', 'q');
    expect(result).toEqual({ sent: true });
  });

  it('is branded GDG Kolachi rather than the workshop series, and invites replies', async () => {
    const resend = fakeResend();
    await serviceWith(resend).sendShortlistedEmail('a@example.com', 'A', talk, 'reg-1', 'q');
    const html = resend.sent[0].html;
    expect(html).not.toMatch(/Workshop Series|Build with AI/);
    expect(html).not.toMatch(/do not reply/i);
    expect(html).toContain('Reply to this email');
  });

  it('reports the reason when the provider refuses the email', async () => {
    const resend = fakeResend(() => 'You have reached your daily email sending quota');
    const result = await serviceWith(resend).sendShortlistedEmail('a@example.com', 'A', talk, 'reg-1', 'q');
    expect(result).toEqual({ sent: false, error: 'You have reached your daily email sending quota' });
  });

  it('waits and retries when the provider says it is sending too fast', async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValueOnce({ data: null, error: { name: 'rate_limit_exceeded', message: 'Too many requests' } } as any);
    const result = await serviceWith(resend).sendShortlistedEmail('a@example.com', 'A', talk, 'reg-1', 'q');
    expect(result).toEqual({ sent: true });
    expect(resend.emails.send).toHaveBeenCalledTimes(2);
  });

  it('gives up after three rate-limited attempts and says why', async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValue({ data: null, error: { name: 'rate_limit_exceeded', message: 'Too many requests' } } as any);
    const result = await serviceWith(resend).sendShortlistedEmail('a@example.com', 'A', talk, 'reg-1', 'q');
    expect(result).toEqual({ sent: false, error: 'Too many requests' });
    expect(resend.emails.send).toHaveBeenCalledTimes(3);
  });

  it('does not retry a daily quota error', async () => {
    const resend = fakeResend();
    resend.emails.send.mockResolvedValue({ data: null, error: { name: 'daily_quota_exceeded', message: 'Daily quota reached' } } as any);
    await serviceWith(resend).sendShortlistedEmail('a@example.com', 'A', talk, 'reg-1', 'q');
    expect(resend.emails.send).toHaveBeenCalledTimes(1);
  });

  it('reports a network failure instead of throwing', async () => {
    const resend = fakeResend();
    resend.emails.send.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND api.resend.com'));
    const result = await serviceWith(resend).sendShortlistedEmail('a@example.com', 'A', talk, 'reg-1', 'q');
    expect(result).toEqual({ sent: false, error: 'getaddrinfo ENOTFOUND api.resend.com' });
  });

  it('does not count a missing email provider (local development) as a failure', async () => {
    const result = await serviceWith(undefined).sendShortlistedEmail('a@example.com', 'A', talk, 'reg-1', 'q');
    expect(result).toEqual({ sent: false });
  });
});

describe('reminder batch', () => {
  it('sends one reminder per person across thousands of recipients and lists exactly the ones that failed', async () => {
    const bounced = new Set(['p499@example.com', 'p1499@example.com', 'p2499@example.com']);
    const resend = fakeResend((to) => (bounced.has(to) ? 'Email address is on the suppression list' : null));
    const recipients = Array.from({ length: 2500 }, (_, i) => ({
      // a few people share an address, as happens when friends register each other
      email: i % 1000 === 7 ? 'shared@example.com' : `p${i}@example.com`,
      name: i % 250 === 0 ? '' : i % 3 === 0 ? `محمد ${i}` : `Attendee ${i}`,
      event: { ...talk, is_online: true },
      registrationId: `reg-${i}`,
      qrData: '',
    }));

    const result = await serviceWith(resend).sendReminderBatch(recipients, 'Doors open at 11:30.');

    expect(resend.sent).toHaveLength(2500);
    expect(result.sent).toBe(2497);
    expect(result.failedIds).toEqual(['reg-499', 'reg-1499', 'reg-2499']);
  });

  it('escapes the attendee name and keeps the organizers\' note as plain text', async () => {
    const resend = fakeResend();
    await serviceWith(resend).sendReminderBatch(
      [{ email: 'a@example.com', name: hostileNames[0], event: talk, registrationId: 'reg-1', qrData: '{"registrationId":"reg-1"}' }],
      '<b>Bring your laptop</b>',
    );
    const html = resend.sent[0].html;
    expect(html).not.toContain('<a href="https://evil');
    expect(html).toContain('&lt;b&gt;Bring your laptop&lt;/b&gt;');
  });
});

describe('rejection batch', () => {
  it('lists everyone in a chunk the provider refused and counts the rest as sent', async () => {
    const resend = fakeResend();
    resend.batch.send
      .mockResolvedValueOnce({ data: { data: Array.from({ length: 100 }, (_, i) => ({ id: `ok-${i}` })) }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Too many requests' } })
      .mockRejectedValueOnce(new Error('socket hang up'));
    const recipients = Array.from({ length: 250 }, (_, i) => ({
      id: `reg-${i}`, email: `r${i}@example.com`, name: `Applicant ${i}`, event: { title: talk.title },
    }));

    const result = await serviceWith(resend).sendRejectionBatch(recipients);

    expect(result.sent).toBe(100);
    expect(result.failedIds).toHaveLength(150);
    expect(result.failedIds[0]).toBe('reg-100');
    expect(result.failedIds[149]).toBe('reg-249');
  });

  it('escapes HTML in applicant names', async () => {
    const resend = fakeResend();
    resend.batch.send.mockResolvedValueOnce({ data: { data: [{ id: 'x' }] }, error: null });
    await serviceWith(resend).sendRejectionBatch([{ id: 'reg-1', email: 'a@example.com', name: hostileNames[2], event: { title: talk.title } }]);
    const html = resend.batch.send.mock.calls[0][0][0].html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('O&#39;Brien &amp; Sons');
  });
});

describe('team emails', () => {
  it('escapes the team name in the message header', async () => {
    const resend = fakeResend();
    await serviceWith(resend).sendTeamMessageEmail({
      captainEmail: 'cap@example.com', captainName: 'Sana', memberEmails: ['cap@example.com', 'm@example.com'],
      teamLabel: '<img src=x onerror=alert(1)>', eventTitle: 'Hackathon', subject: 'Venue change', message: 'Hall B',
    });
    expect(resend.sent[0].html).not.toContain('<img src=x');
  });

  it('gives the deposit deadline in Pakistan time and points at the account and button above', async () => {
    const resend = fakeResend();
    await serviceWith(resend).sendTeamPaymentRequestEmail({
      captainEmail: 'cap@example.com', captainName: 'Sana', memberEmails: [], teamLabel: 'Team 12', memberCount: 4,
      eventTitle: 'Hackathon', deadline: new Date('2026-10-09T18:59:00Z'), submitUrl: 'https://register.example/teams/1/deposit',
      deposit: { display: 'Rs 1,000', payeeName: 'GDG', bankName: 'Bank', accountNumber: '1', iban: 'PK00', swift: 'X', windowHours: 24 },
    });
    const html = resend.sent[0].html;
    expect(html).toContain('Friday, 9 October 2026, 11:59 PM PKT');
    expect(html).toContain('to the account above');
    expect(html).toContain('using the button above');
  });
});
