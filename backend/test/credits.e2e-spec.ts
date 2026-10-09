/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- raw SQL rows and supertest bodies are untyped */
/**
 * End-to-end tests for the Google Cloud credits email (docs/cloud-credits.md).
 *
 * Boots the real AppModule against a throwaway Postgres database with the
 * Resend mailer replaced by a recording fake. Needs a reachable Postgres 16:
 *
 *   DB_HOST=127.0.0.1 DB_PORT=54329 DB_USER=postgres DB_PASSWORD=postgres
 *   DB_NAME=gdg_bwai_test  (these are the defaults below; override via env)
 *
 * The sender is driven by calling `CreditsSender.tick()` directly (the timer is
 * off via CREDITS_WORKER_ENABLED=false), so retries are tested by rewriting
 * `email_next_attempt_at` instead of sleeping.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';

// The environment must be set before AppModule is loaded: its TypeORM config
// reads process.env when the module file is evaluated.
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '54329';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_NAME = 'gdg_bwai_test';
delete process.env.DATABASE_URL;
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.ADMIN_EMAIL = 'super@test.example';
process.env.ADMIN_PASSWORD = 'super-pass-123';
process.env.CREDITS_WORKER_ENABLED = 'false';
process.env.APP_URL = 'https://register.example.test';
process.env.FRONTEND_URL = 'https://register.example.test';
process.env.CREDITS_EMAIL_PER_SECOND = '100';
delete process.env.RESEND_API_KEY;

/* eslint-disable @typescript-eslint/no-require-imports */
const { AppModule } = require('../src/app.module');
const { CREDITS_MAILER } = require('../src/credits/credits.mailer');
const { CreditsSender } = require('../src/credits/credits-sender.service');
/* eslint-enable @typescript-eslint/no-require-imports */
import type {
  CreditsEmailMessage,
  CreditsMailer,
  CreditsSendResult,
} from '../src/credits/credits.mailer';

const ORIGIN = 'https://register.example.test';
const CLAIM_URL = 'https://cloud.google.com/claim-credits-test';
const VIDEO_URL = 'https://www.youtube.com/watch?v=unlisted123';
const SELF_RESEND_MESSAGE =
  "If you're checked in, we've sent the email again. Check your inbox and spam folder in a minute or two.";

interface Recorded {
  message: CreditsEmailMessage;
  idempotencyKey: string;
  at: number;
}

/** Recording fake for the credits mailer; can be told to fail. */
class FakeMailer implements CreditsMailer {
  sent: Recorded[] = [];
  calls: Recorded[] = [];
  /** Number of upcoming sends that fail retryably (Infinity = always). */
  failRetryable = 0;
  failPermanent = false;

  reset() {
    this.sent = [];
    this.calls = [];
    this.failRetryable = 0;
    this.failPermanent = false;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async send(
    message: CreditsEmailMessage,
    options: { idempotencyKey: string },
  ): Promise<CreditsSendResult> {
    const rec = {
      message,
      idempotencyKey: options.idempotencyKey,
      at: Date.now(),
    };
    this.calls.push(rec);
    if (this.failPermanent)
      return {
        ok: false,
        retryable: false,
        error: 'validation_error: bad address',
      };
    if (this.failRetryable > 0) {
      this.failRetryable--;
      return {
        ok: false,
        retryable: true,
        error: 'rate_limit_exceeded: slow down',
      };
    }
    this.sent.push(rec);
    return { ok: true, id: `fake-${this.sent.length}` };
  }
}

/**
 * Throttling is neutralised for the whole run: the global ThrottlerGuard
 * (100/min per IP, and every supertest request comes from the same IP) would
 * 429 a busy test run, so the throttler storage is replaced by one that never
 * counts a hit. The exact limits are deliberately not tested.
 */
const noThrottleStorage = {
  // eslint-disable-next-line @typescript-eslint/require-await
  increment: async () => ({
    totalHits: 1,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  }),
};

describe('Google Cloud credits (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  let sender: { tick(): Promise<number> };
  const mailer = new FakeMailer();
  const extraApps: INestApplication[] = [];

  let superToken: string;
  let organizerToken: string;
  let volunteerToken: string;
  let volunteerId: string;
  let workshopTypeId: string;
  let hackathonTypeId: string;

  async function createApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CREDITS_MAILER)
      .useValue(mailer)
      .overrideProvider(ThrottlerStorage)
      .useValue(noThrottleStorage)
      .compile();
    const instance = moduleRef.createNestApplication();
    instance.setGlobalPrefix('api');
    instance.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await instance.init();
    // Listen once on an ephemeral port: without this supertest binds a new
    // port per request, which breaks under the 80-way concurrent burst.
    await instance.listen(0);
    return instance;
  }

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(201);
    return {
      token: res.body.access_token as string,
      id: res.body.user.id as string,
    };
  }

  async function ensureAdmin(email: string, role: string, name: string) {
    const hash = await bcrypt.hash('test-pass-123', 4);
    await db.query(
      `INSERT INTO admins (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash`,
      [email, hash, name, role],
    );
  }

  beforeAll(async () => {
    app = await createApp();
    db = app.get(DataSource);
    sender = app.get(CreditsSender);

    await ensureAdmin(
      'organizer@test.example',
      'organizer',
      'Olivia Organizer',
    );
    await ensureAdmin(
      'volunteer@test.example',
      'volunteer',
      'Victor Volunteer',
    );
    superToken = (await login('super@test.example', 'super-pass-123')).token;
    organizerToken = (await login('organizer@test.example', 'test-pass-123'))
      .token;
    const vol = await login('volunteer@test.example', 'test-pass-123');
    volunteerToken = vol.token;
    volunteerId = vol.id;

    workshopTypeId = (
      await db.query(`SELECT id FROM event_types WHERE slug = 'workshop'`)
    )[0].id;
    hackathonTypeId = (
      await db.query(`SELECT id FROM event_types WHERE slug = 'hackathon'`)
    )[0].id;
  }, 60000);

  afterAll(async () => {
    for (const a of extraApps) await a.close();
    await app.close();
  });

  beforeEach(async () => {
    mailer.reset();
    process.env.CREDITS_EMAIL_PER_SECOND = '100';
    await db.query(
      `TRUNCATE credit_redemptions, registrations, attendees, events RESTART IDENTITY CASCADE`,
    );
  });

  // ------------------------------------------------------------------ seeding

  async function seedEvent(
    opts: {
      enabled?: boolean;
      claim?: string | null;
      video?: string | null;
      hackathon?: boolean;
      title?: string;
    } = {},
  ): Promise<string> {
    const [row] = await db.query(
      `INSERT INTO events (event_type_id, title, description, date, time, venue, max_capacity,
                           credits_enabled, credits_claim_url, credits_video_url)
       VALUES ($1, $2, 'desc', '2026-11-01', '10:00', 'Karachi', 500, $3, $4, $5) RETURNING id`,
      [
        opts.hackathon ? hackathonTypeId : workshopTypeId,
        opts.title ?? 'Build with AI',
        opts.enabled ?? true,
        opts.claim === undefined ? CLAIM_URL : opts.claim,
        opts.video === undefined ? null : opts.video,
      ],
    );
    return row.id;
  }

  let seq = 0;
  async function seedReg(
    eventId: string,
    opts: {
      checkedIn?: boolean;
      email?: string;
      name?: string;
      status?: string;
      deleted?: boolean;
      checkedInAt?: Date | null;
    } = {},
  ): Promise<{ id: string; email: string }> {
    seq++;
    const email = opts.email ?? `person${seq}@example.test`;
    const [att] = await db.query(
      `INSERT INTO attendees (name, email, phone, university_org, cnic)
       VALUES ($1, $2, '0300', 'NED', $3) RETURNING id`,
      [
        opts.name ?? `Person ${seq} Test`,
        email,
        `42101-${String(seq).padStart(7, '0')}-1`,
      ],
    );
    const checkedIn = opts.checkedIn ?? false;
    const [reg] = await db.query(
      `INSERT INTO registrations (attendee_id, event_id, status, checked_in, checked_in_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        att.id,
        eventId,
        opts.status ?? 'confirmed',
        checkedIn,
        opts.checkedInAt === undefined
          ? checkedIn
            ? new Date()
            : null
          : opts.checkedInAt,
        opts.deleted ? new Date() : null,
      ],
    );
    return { id: reg.id, email };
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const rowFor = async (registrationId: string) =>
    (
      await db.query(
        `SELECT * FROM credit_redemptions WHERE registration_id = $1`,
        [registrationId],
      )
    )[0];
  const rowCount = async () =>
    Number(
      (await db.query(`SELECT count(*) FROM credit_redemptions`))[0].count,
    );
  const scan = (id: string, token = volunteerToken) =>
    request(app.getHttpServer())
      .patch(`/api/admin/qr-scan/${id}/attend`)
      .set(auth(token));
  const publicGet = (path: string) =>
    request(app.getHttpServer()).get(`/api/public/credits/${path}`);

  /** Runs the sender until nothing is due. */
  async function drain(s = sender) {
    let guard = 0;
    while ((await s.tick()) > 0 && guard++ < 50) {
      /* keep going */
    }
  }

  // ------------------------------------------------------------ event settings

  describe('event settings', () => {
    it('validates https URLs, clears with null/empty, and hides the claim link from public endpoints', async () => {
      const eventId = await seedEvent({ enabled: false, claim: null });
      const patch = (body: object) =>
        request(app.getHttpServer())
          .patch(`/api/admin/events/${eventId}`)
          .set(auth(organizerToken))
          .send(body);

      await patch({ credits_claim_url: 'http://insecure.example' }).expect(400);
      await patch({ credits_video_url: 'javascript:alert(1)' }).expect(400);

      const ok = await patch({
        credits_enabled: true,
        credits_claim_url: CLAIM_URL,
        credits_video_url: VIDEO_URL,
      }).expect(200);
      expect(ok.body.credits_enabled).toBe(true);
      expect(ok.body.credits_claim_url).toBe(CLAIM_URL);

      const publicList = await request(app.getHttpServer())
        .get('/api/events')
        .expect(200);
      expect(JSON.stringify(publicList.body)).not.toContain(CLAIM_URL);
      const publicOne = await request(app.getHttpServer())
        .get(`/api/events/${eventId}`)
        .expect(200);
      expect(publicOne.body.title).toBe('Build with AI');
      expect(JSON.stringify(publicOne.body)).not.toContain(CLAIM_URL);
      const adminList = await request(app.getHttpServer())
        .get('/api/admin/events')
        .set(auth(organizerToken))
        .expect(200);
      expect(JSON.stringify(adminList.body)).toContain(CLAIM_URL);

      const cleared = await patch({ credits_video_url: '' }).expect(200);
      expect(cleared.body.credits_video_url).toBeNull();
    });

    it('accepts the credits fields when creating an event and rejects a bad URL', async () => {
      const body = {
        event_type_id: workshopTypeId,
        title: 'New event',
        description: 'd',
        date: '2026-12-01',
        time: '10:00',
        venue: 'v',
        max_capacity: 10,
        credits_enabled: true,
        credits_claim_url: CLAIM_URL,
      };
      const created = await request(app.getHttpServer())
        .post('/api/admin/events')
        .set(auth(organizerToken))
        .send(body)
        .expect(201);
      expect(created.body.credits_claim_url).toBe(CLAIM_URL);
      await request(app.getHttpServer())
        .post('/api/admin/events')
        .set(auth(organizerToken))
        .send({ ...body, credits_claim_url: 'ftp://nope' })
        .expect(400);
    });
  });

  // ------------------------------------------------------------ queue on check-in

  describe('queueing on QR check-in', () => {
    it('queues and sends exactly one email per QR check-in', async () => {
      const eventId = await seedEvent();
      const reg = await seedReg(eventId, { name: 'Ayesha Khan' });

      const res = await scan(reg.id).expect(200);
      expect(res.body.checked_in).toBe(true);
      expect(res.body.credits).toEqual({ status: 'pending' });

      const row = await rowFor(reg.id);
      expect(row.email_status).toBe('pending');
      expect(row.source).toBe('qr_scan');
      expect(row.created_by_admin_id).toBe(volunteerId);
      expect(row.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(mailer.sent).toHaveLength(0); // nothing goes out until the sender runs

      await drain();
      expect(mailer.sent).toHaveLength(1);
      const sent = mailer.sent[0];
      expect(sent.message.to).toBe(reg.email);
      expect(sent.message.subject).toBe(
        'Claim your Google Cloud credits – Build with AI',
      );
      expect(sent.idempotencyKey).toBe(`credits-${row.id}-1`);
      expect(sent.message.html).toContain('Hi Ayesha');
      expect(sent.message.html).toContain(
        `${ORIGIN}/api/public/credits/${row.token}/claim`,
      );
      expect(sent.message.html).toContain(`${ORIGIN}/credits/${row.token}`);
      expect(sent.message.html).not.toContain(CLAIM_URL); // links go through our tracker
      expect(sent.message.html).not.toContain('credits-video-thumb.png'); // no video configured
      expect(sent.message.text).toContain(`${ORIGIN}/credits/${row.token}`);

      const after = await rowFor(reg.id);
      expect(after.email_status).toBe('sent');
      expect(after.email_sent_at).toBeTruthy();
      expect(after.email_attempts).toBe(1);

      await drain();
      expect(mailer.sent).toHaveLength(1);
    });

    it('includes the video block (thumbnail + tracked link) only when the event has a video URL', async () => {
      const eventId = await seedEvent({ video: VIDEO_URL });
      const reg = await seedReg(eventId);
      await scan(reg.id).expect(200);
      await drain();
      const row = await rowFor(reg.id);
      const html = mailer.sent[0].message.html;
      expect(html).toContain(`${ORIGIN}/images/credits-video-thumb.png`);
      expect(html).toContain(`${ORIGIN}/api/public/credits/${row.token}/video`);
      expect(html).not.toContain(VIDEO_URL);
    });

    it('double scan and two concurrent scans still produce one row and one email', async () => {
      const eventId = await seedEvent();
      const a = await seedReg(eventId);
      await scan(a.id).expect(200);
      const second = await scan(a.id).expect(200);
      expect(second.body.credits).toEqual({ status: 'pending' });

      const b = await seedReg(eventId);
      await Promise.all(Array.from({ length: 8 }, () => scan(b.id)));

      expect(await rowCount()).toBe(2);
      await drain();
      expect(mailer.sent).toHaveLength(2);
      expect(new Set(mailer.sent.map((s) => s.message.to))).toEqual(
        new Set([a.email, b.email]),
      );
    });

    it('un-check then re-scan does not send a second email', async () => {
      const eventId = await seedEvent();
      const reg = await seedReg(eventId);
      await scan(reg.id).expect(200);
      await drain();
      expect(mailer.sent).toHaveLength(1);

      // desk toggle off, then scan again
      await request(app.getHttpServer())
        .patch(`/api/admin/checkin/${reg.id}/toggle`)
        .set(auth(volunteerToken))
        .expect(200);
      expect(
        (
          await db.query(`SELECT checked_in FROM registrations WHERE id = $1`, [
            reg.id,
          ])
        )[0].checked_in,
      ).toBe(false);
      const rescan = await scan(reg.id).expect(200);
      expect(rescan.body.credits).toEqual({ status: 'sent' });

      await drain();
      expect(mailer.sent).toHaveLength(1);
      expect(await rowCount()).toBe(1);
    });

    it('sends nothing for the desk toggle, status changes, bulk changes or CSV status import', async () => {
      const eventId = await seedEvent();
      const toggled = await seedReg(eventId);
      const single = await seedReg(eventId);
      const bulk = await seedReg(eventId);
      const bulkAlias = await seedReg(eventId);
      const imported = await seedReg(eventId);

      await request(app.getHttpServer())
        .patch(`/api/admin/checkin/${toggled.id}/toggle`)
        .set(auth(volunteerToken))
        .expect(200);
      await request(app.getHttpServer())
        .patch(`/api/admin/registrations/${single.id}/status`)
        .set(auth(organizerToken))
        .send({ status: 'attended' })
        .expect(200);
      await request(app.getHttpServer())
        .patch('/api/admin/registrations/bulk-status')
        .set(auth(organizerToken))
        .send({ ids: [bulk.id], status: 'attended' })
        .expect(200);
      await request(app.getHttpServer())
        .patch('/api/admin/registrations/status')
        .set(auth(organizerToken))
        .send({ ids: [bulkAlias.id], status: 'attended' })
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/admin/registrations/import-status')
        .set(auth(organizerToken))
        .send({ csv: imported.id, status: 'attended' })
        .expect(201);

      const checked = await db.query(
        `SELECT count(*)::int AS n FROM registrations WHERE checked_in = true`,
      );
      expect(checked[0].n).toBe(5); // all of them really are checked in...
      expect(await rowCount()).toBe(0); // ...and none queued a credits email
      await drain();
      expect(mailer.calls).toHaveLength(0);
    });

    it('sends nothing when credits are disabled, there is no claim URL, or the registration is deleted', async () => {
      const disabled = await seedReg(await seedEvent({ enabled: false }));
      const noUrl = await seedReg(await seedEvent({ claim: null }));
      const deleted = await seedReg(await seedEvent(), { deleted: true });

      for (const r of [disabled, noUrl, deleted]) {
        const res = await scan(r.id).expect(200);
        expect(res.body.credits).toEqual({ status: 'not_queued' });
      }
      expect(await rowCount()).toBe(0);
      await drain();
      expect(mailer.calls).toHaveLength(0);
    });

    it('a scan upgrades a not_sent row (credits QR shown first) to one email, and re-scans add nothing', async () => {
      const eventId = await seedEvent();
      const reg = await seedReg(eventId, { checkedIn: true });
      await request(app.getHttpServer())
        .get(`/api/admin/credits/registrations/${reg.id}/qr`)
        .set(auth(volunteerToken))
        .expect(200);
      const before = await rowFor(reg.id);
      expect(before.email_status).toBe('not_sent');
      await drain();
      expect(mailer.calls).toHaveLength(0);

      const res = await scan(reg.id).expect(200);
      expect(res.body.credits).toEqual({ status: 'pending' });
      const after = await rowFor(reg.id);
      expect(after.token).toBe(before.token);
      expect(after.source).toBe('volunteer_qr');
      expect(after.email_generation).toBe(1);
      await drain();
      expect(mailer.sent).toHaveLength(1);

      await scan(reg.id).expect(200);
      await drain();
      expect(mailer.sent).toHaveLength(1);
    });

    it('404s the scan for an unknown registration', async () => {
      await scan('00000000-0000-4000-8000-000000000000').expect(404);
    });
  });

  // ------------------------------------------------------------ sender behaviour

  describe('sender', () => {
    it('keeps check-in working when the provider fails, retries with backoff, ends failed, and resend recovers', async () => {
      const eventId = await seedEvent();
      const reg = await seedReg(eventId);
      mailer.failRetryable = Infinity;

      const res = await scan(reg.id).expect(200);
      expect(res.body.status).toBe('attended');
      expect(res.body.checked_in).toBe(true);

      const expectedDelays = [15, 60, 300, 900]; // seconds
      for (let attempt = 1; attempt <= 4; attempt++) {
        expect(await sender.tick()).toBe(1);
        const row = await rowFor(reg.id);
        expect(row.email_status).toBe('pending');
        expect(row.email_attempts).toBe(attempt);
        expect(row.email_last_error).toContain('rate_limit_exceeded');
        const delay =
          (new Date(row.email_next_attempt_at).getTime() - Date.now()) / 1000;
        expect(delay).toBeGreaterThan(expectedDelays[attempt - 1] - 5);
        expect(delay).toBeLessThanOrEqual(expectedDelays[attempt - 1] + 1);

        // not due yet: a tick does nothing
        expect(await sender.tick()).toBe(0);
        // make it due without sleeping
        await db.query(
          `UPDATE credit_redemptions SET email_next_attempt_at = now() - interval '1 second'`,
        );
      }

      expect(await sender.tick()).toBe(1); // 5th and last attempt
      const failed = await rowFor(reg.id);
      expect(failed.email_status).toBe('failed');
      expect(failed.email_attempts).toBe(5);
      expect(failed.email_next_attempt_at).toBeNull();
      expect(failed.email_last_error).toContain('rate_limit_exceeded');
      expect(await sender.tick()).toBe(0);
      expect(mailer.sent).toHaveLength(0);
      // every retry reused one idempotency key
      expect(new Set(mailer.calls.map((c) => c.idempotencyKey))).toEqual(
        new Set([`credits-${failed.id}-1`]),
      );

      // the admin sees the error and presses Resend
      mailer.failRetryable = 0;
      const resend = await request(app.getHttpServer())
        .post(`/api/admin/credits/registrations/${reg.id}/send`)
        .set(auth(volunteerToken))
        .expect(200);
      expect(resend.body.email_status).toBe('pending');
      const requeued = await rowFor(reg.id);
      expect(requeued.email_generation).toBe(2);
      expect(requeued.email_attempts).toBe(0);
      expect(requeued.email_last_error).toBeNull();

      await drain();
      expect(mailer.sent).toHaveLength(1);
      expect(mailer.sent[0].idempotencyKey).toBe(`credits-${failed.id}-2`);
      expect((await rowFor(reg.id)).email_status).toBe('sent');
    });

    it('fails immediately on a permanent (validation) error', async () => {
      const reg = await seedReg(await seedEvent());
      mailer.failPermanent = true;
      await scan(reg.id).expect(200);
      expect(await sender.tick()).toBe(1);
      const row = await rowFor(reg.id);
      expect(row.email_status).toBe('failed');
      expect(row.email_attempts).toBe(1);
      expect(row.email_last_error).toContain('validation_error');
      expect(await sender.tick()).toBe(0);
    });

    it('reclaims a row stuck in sending for more than 2 minutes, but not a fresh one', async () => {
      const eventId = await seedEvent();
      const stuck = await seedReg(eventId);
      const fresh = await seedReg(eventId);
      await scan(stuck.id).expect(200);
      await scan(fresh.id).expect(200);
      await db.query(
        `UPDATE credit_redemptions SET email_status = 'sending', email_attempts = 1, updated_at = now() - interval '3 minutes'
          WHERE registration_id = $1`,
        [stuck.id],
      );
      await db.query(
        `UPDATE credit_redemptions SET email_status = 'sending', email_attempts = 1, updated_at = now() - interval '10 seconds'
          WHERE registration_id = $1`,
        [fresh.id],
      );

      await drain();
      expect(mailer.sent.map((s) => s.message.to)).toEqual([stuck.email]);
      expect((await rowFor(stuck.id)).email_status).toBe('sent');
      expect((await rowFor(fresh.id)).email_status).toBe('sending');
    });

    it('a restarted app instance sends rows left pending', async () => {
      const eventId = await seedEvent();
      const reg = await seedReg(eventId);
      await scan(reg.id).expect(200); // worker is off, so the row stays pending
      expect((await rowFor(reg.id)).email_status).toBe('pending');
      expect(mailer.calls).toHaveLength(0);

      const second = await createApp(); // simulated restart: a fresh instance on the same database
      extraApps.push(second);
      await drain(second.get(CreditsSender));

      expect(mailer.sent).toHaveLength(1);
      expect(mailer.sent[0].message.to).toBe(reg.email);
      expect((await rowFor(reg.id)).email_status).toBe('sent');
    });

    it('does not start its timer when CREDITS_WORKER_ENABLED=false', async () => {
      const reg = await seedReg(await seedEvent());
      await scan(reg.id).expect(200);
      await new Promise((r) => setTimeout(r, 1500));
      expect(mailer.calls).toHaveLength(0);
      expect((await rowFor(reg.id)).email_status).toBe('pending');
    });

    it('sends a burst of 80 scans exactly once each, under the rate cap', async () => {
      const eventId = await seedEvent();
      const regs = [];
      for (let i = 0; i < 80; i++)
        regs.push(await seedReg(eventId, { status: 'shortlisted' }));

      const responses = await Promise.all(regs.map((r) => scan(r.id)));
      expect(responses.every((r) => r.status === 200)).toBe(true);
      expect(await rowCount()).toBe(80);

      process.env.CREDITS_EMAIL_PER_SECOND = '20';
      await drain();

      expect(mailer.sent).toHaveLength(80);
      expect(new Set(mailer.sent.map((s) => s.idempotencyKey)).size).toBe(80);
      expect(new Set(mailer.sent.map((s) => s.message.to)).size).toBe(80);
      const times = mailer.sent.map((s) => s.at).sort((a, b) => a - b);
      for (let i = 1; i < times.length; i++) {
        expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(45); // 20/s = 50ms apart
      }
      const states = await db.query(
        `SELECT email_status, count(*)::int AS n FROM credit_redemptions GROUP BY 1`,
      );
      expect(states).toEqual([{ email_status: 'sent', n: 80 }]);
    }, 60000);
  });

  // ------------------------------------------------------------ public endpoints

  describe('public endpoints', () => {
    async function seedSent(opts: { video?: string | null } = {}) {
      const eventId = await seedEvent({
        video: opts.video === undefined ? VIDEO_URL : opts.video,
      });
      const reg = await seedReg(eventId, {
        name: 'Sara Ahmed',
        checkedIn: true,
      });
      await request(app.getHttpServer())
        .post(`/api/admin/credits/registrations/${reg.id}/send`)
        .set(auth(volunteerToken))
        .expect(200);
      await drain();
      const row = await rowFor(reg.id);
      return { eventId, reg, row, token: row.token as string };
    }

    it('404s an unknown or malformed token on every route', async () => {
      const unknown = 'A'.repeat(43);
      await publicGet(unknown).expect(404);
      await publicGet('short').expect(404);
      await request(app.getHttpServer())
        .post(`/api/public/credits/${unknown}/redeem`)
        .expect(404);
      await publicGet(`${unknown}/claim`).expect(404);
      await publicGet(`${unknown}/video`).expect(404);
    });

    it('serves the confirm-page data with tracked URLs and records the first open', async () => {
      const { token, row } = await seedSent();
      expect(row.confirm_page_opened_at).toBeNull();
      const res = await publicGet(token).expect(200);
      expect(res.body).toEqual({
        first_name: 'Sara',
        event_title: 'Build with AI',
        claim_url: `${ORIGIN}/api/public/credits/${token}/claim`,
        video_url: `${ORIGIN}/api/public/credits/${token}/video`,
        redeemed: false,
        redeemed_at: null,
      });
      const opened = (await rowFor(row.registration_id)).confirm_page_opened_at;
      expect(opened).toBeTruthy();
      await publicGet(token).expect(200);
      expect(
        (await rowFor(row.registration_id)).confirm_page_opened_at,
      ).toEqual(opened); // first occurrence only
    });

    it('omits video_url when the event has none', async () => {
      const { token } = await seedSent({ video: null });
      const res = await publicGet(token).expect(200);
      expect(res.body.video_url).toBeNull();
      await publicGet(`${token}/video`).expect(404);
    });

    it('redeems idempotently and returns the original time on a repeat', async () => {
      const { token, row } = await seedSent();
      const first = await request(app.getHttpServer())
        .post(`/api/public/credits/${token}/redeem`)
        .expect(200);
      expect(first.body.redeemed).toBe(true);
      await new Promise((r) => setTimeout(r, 20));
      const second = await request(app.getHttpServer())
        .post(`/api/public/credits/${token}/redeem`)
        .expect(200);
      expect(second.body.redeemed_at).toBe(first.body.redeemed_at);

      const after = await rowFor(row.registration_id);
      expect(after.redeemed_via).toBe('attendee');
      expect(after.redeemed_by_admin_id).toBeNull();
      const page = await publicGet(token).expect(200);
      expect(page.body.redeemed).toBe(true);
      expect(page.body.redeemed_at).toBe(first.body.redeemed_at);
    });

    it('redirects claim and video with 302 and records only the first click', async () => {
      const { token, row } = await seedSent();
      const claim = await publicGet(`${token}/claim`).redirects(0).expect(302);
      expect(claim.headers.location).toBe(CLAIM_URL);
      const video = await publicGet(`${token}/video`).redirects(0).expect(302);
      expect(video.headers.location).toBe(VIDEO_URL);

      const clicked = await rowFor(row.registration_id);
      expect(clicked.claim_clicked_at).toBeTruthy();
      expect(clicked.video_clicked_at).toBeTruthy();
      await new Promise((r) => setTimeout(r, 20));
      await publicGet(`${token}/claim`).redirects(0).expect(302);
      expect((await rowFor(row.registration_id)).claim_clicked_at).toEqual(
        clicked.claim_clicked_at,
      );
    });

    it('404s everything once the registration is soft-deleted', async () => {
      const { token, reg } = await seedSent();
      await request(app.getHttpServer())
        .delete(`/api/admin/registrations/${reg.id}`)
        .set(auth(organizerToken))
        .expect(200);
      await publicGet(token).expect(404);
      await request(app.getHttpServer())
        .post(`/api/public/credits/${token}/redeem`)
        .expect(404);
      await publicGet(`${token}/claim`).redirects(0).expect(404);
      await publicGet(`${token}/video`).redirects(0).expect(404);
    });
  });

  // ------------------------------------------------------------ self-service resend

  describe('self-service resend', () => {
    const resend = (email: string, eventId: string) =>
      request(app.getHttpServer())
        .post('/api/public/credits/resend')
        .send({ email, event_id: eventId });

    it('gives the same answer whatever the email is, and only re-queues an existing row for a checked-in person', async () => {
      const eventId = await seedEvent();
      const sentReg = await seedReg(eventId, { email: 'sent@example.test' });
      await scan(sentReg.id).expect(200);
      await drain();
      expect(mailer.sent).toHaveLength(1);
      const notCheckedIn = await seedReg(eventId, {
        email: 'late@example.test',
      });
      const checkedInNoRow = await seedReg(eventId, {
        email: 'desk@example.test',
        checkedIn: true,
      });

      // cooldown: the first email was sent seconds ago, so this does nothing
      const bodies = [];
      for (const email of [
        'sent@example.test',
        'nobody@example.test',
        'late@example.test',
        'desk@example.test',
      ]) {
        const res = await resend(email, eventId).expect(200);
        bodies.push(res.body);
      }
      for (const b of bodies)
        expect(b).toEqual({ message: SELF_RESEND_MESSAGE });
      expect((await rowFor(sentReg.id)).email_generation).toBe(1);
      expect(await rowFor(notCheckedIn.id)).toBeUndefined();
      expect(await rowFor(checkedInNoRow.id)).toBeUndefined(); // never creates a row
      expect(await rowCount()).toBe(1);

      // past the cooldown it re-queues, once
      await db.query(
        `UPDATE credit_redemptions SET email_queued_at = now() - interval '3 minutes'`,
      );
      const again = await resend('SENT@example.test', eventId).expect(200);
      expect(again.body).toEqual({ message: SELF_RESEND_MESSAGE });
      let row = await rowFor(sentReg.id);
      expect(row.email_status).toBe('pending');
      expect(row.email_generation).toBe(2);
      await drain();
      expect(mailer.sent).toHaveLength(2);
      expect(mailer.sent[1].idempotencyKey).toBe(`credits-${row.id}-2`);

      // and the cooldown applies again straight away
      await resend('sent@example.test', eventId).expect(200);
      row = await rowFor(sentReg.id);
      expect(row.email_generation).toBe(2);
      expect(row.email_status).toBe('sent');
    });

    it('does nothing for a soft-deleted registration and validates the payload', async () => {
      const eventId = await seedEvent();
      const reg = await seedReg(eventId, { email: 'gone@example.test' });
      await scan(reg.id).expect(200);
      await drain();
      await db.query(
        `UPDATE registrations SET deleted_at = now() WHERE id = $1`,
        [reg.id],
      );
      await db.query(
        `UPDATE credit_redemptions SET email_queued_at = now() - interval '5 minutes'`,
      );
      const res = await resend('gone@example.test', eventId).expect(200);
      expect(res.body).toEqual({ message: SELF_RESEND_MESSAGE });
      expect((await rowFor(reg.id)).email_status).toBe('sent');

      await request(app.getHttpServer())
        .post('/api/public/credits/resend')
        .send({ email: 'not-an-email', event_id: eventId })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/public/credits/resend')
        .send({ email: 'a@b.test', event_id: 'nope' })
        .expect(400);
    });
  });

  // ------------------------------------------------------------ hackathon

  describe('hackathon check-in', () => {
    const checkin = (id: string, body: object) =>
      request(app.getHttpServer())
        .post(`/api/admin/hackathon-checkin/${id}`)
        .set(auth(volunteerToken))
        .send(body);

    it('queues only when source is "qr"; omitted or "manual" sends nothing', async () => {
      const eventId = await seedEvent({ hackathon: true });
      const viaQr = await seedReg(eventId, { checkedIn: true });
      const viaManual = await seedReg(eventId, { checkedIn: true });
      const viaDefault = await seedReg(eventId, { checkedIn: true });

      const qr = await checkin(viaQr.id, { source: 'qr' }).expect(201);
      expect(qr.body.credits).toEqual({ status: 'pending' });
      expect(qr.body.team).toBeDefined(); // existing response fields are kept
      expect((await rowFor(viaQr.id)).source).toBe('hackathon_scan');

      const manual = await checkin(viaManual.id, { source: 'manual' }).expect(
        201,
      );
      expect(manual.body.credits).toEqual({ status: 'not_queued' });
      const dflt = await checkin(viaDefault.id, {}).expect(201);
      expect(dflt.body.credits).toEqual({ status: 'not_queued' });

      expect(await rowFor(viaManual.id)).toBeUndefined();
      expect(await rowFor(viaDefault.id)).toBeUndefined();
      await checkin(viaQr.id, { source: 'bogus' }).expect(400);

      await drain();
      expect(mailer.sent).toHaveLength(1);
      expect(mailer.sent[0].message.to).toBe(viaQr.email);
    });

    it('a re-scan through the hackathon endpoint after the plain scan stays at one email', async () => {
      const eventId = await seedEvent({ hackathon: true });
      const reg = await seedReg(eventId);
      await scan(reg.id).expect(200); // scanners call attend first...
      await checkin(reg.id, { source: 'qr' }).expect(201); // ...then the hackathon endpoint
      expect(await rowCount()).toBe(1);
      await drain();
      expect(mailer.sent).toHaveLength(1);
    });
  });

  // ------------------------------------------------------------ admin endpoints

  describe('admin endpoints', () => {
    it('reports summary, follow-up lists, the registrations filter and the CSV columns', async () => {
      const eventId = await seedEvent();
      const t0 = Date.now();
      const redeemed = await seedReg(eventId, {
        name: 'Redeemed Rita',
        checkedIn: true,
        checkedInAt: new Date(t0 - 30 * 60000),
      });
      const volunteerConfirmed = await seedReg(eventId, {
        name: 'Confirmed Carl',
        checkedIn: true,
        checkedInAt: new Date(t0 - 20 * 60000),
      });
      const waiting = await seedReg(eventId, {
        name: 'Waiting Wendy',
        checkedIn: true,
        checkedInAt: new Date(t0 - 10 * 60000),
      });
      const broken = await seedReg(eventId, {
        name: 'Broken Ben',
        checkedIn: true,
        checkedInAt: new Date(t0 - 50 * 60000),
      });
      const absent = await seedReg(eventId, { name: 'Absent Amir' });
      await seedReg(eventId, {
        name: 'Norow Nadia',
        checkedIn: true,
        checkedInAt: new Date(t0 - 5 * 60000),
      });

      for (const r of [redeemed, volunteerConfirmed, waiting, broken])
        await scan(r.id).expect(200);
      // scanning stamps checked_in_at with "now"; put the staggered times back
      const checkInTimes: Array<[string, number]> = [
        [redeemed.id, 30],
        [volunteerConfirmed.id, 20],
        [waiting.id, 10],
        [broken.id, 50],
      ];
      for (const [id, minutesAgo] of checkInTimes) {
        await db.query(
          `UPDATE registrations SET checked_in_at = $2 WHERE id = $1`,
          [id, new Date(t0 - minutesAgo * 60000)],
        );
      }
      await drain();
      await db.query(
        `UPDATE credit_redemptions SET email_status = 'failed', email_last_error = 'boom' WHERE registration_id = $1`,
        [broken.id],
      );
      await db.query(
        `UPDATE credit_redemptions SET claim_clicked_at = now(), redeemed_at = now(), redeemed_via = 'attendee' WHERE registration_id = $1`,
        [redeemed.id],
      );
      await db.query(
        `UPDATE credit_redemptions SET claim_clicked_at = now() WHERE registration_id = $1`,
        [waiting.id],
      );
      await request(app.getHttpServer())
        .post(
          `/api/admin/credits/registrations/${volunteerConfirmed.id}/confirm`,
        )
        .set(auth(volunteerToken))
        .expect(200);
      void absent;

      const summary = await request(app.getHttpServer())
        .get(`/api/admin/credits/events/${eventId}/summary`)
        .set(auth(volunteerToken))
        .expect(200);
      expect(summary.body.checked_in).toBe(5);
      expect(summary.body.emails).toEqual({
        not_sent: 0,
        pending: 0,
        sending: 0,
        sent: 3,
        failed: 1,
      });
      expect(summary.body.claim_clicks).toBe(2);
      expect(summary.body.redeemed).toEqual({
        total: 2,
        attendee: 1,
        volunteer: 1,
      });

      const follow = await request(app.getHttpServer())
        .get(
          `/api/admin/credits/events/${eventId}/follow-up?filter=not_redeemed`,
        )
        .set(auth(volunteerToken))
        .expect(200);
      expect(follow.body.map((r: any) => r.name)).toEqual([
        'Broken Ben',
        'Waiting Wendy',
        'Norow Nadia',
      ]); // oldest check-in first
      expect(follow.body[0].minutes_since_check_in).toBeGreaterThanOrEqual(49);
      expect(follow.body[0].credits.email_status).toBe('failed');
      expect(follow.body[0].credits.email_last_error).toBe('boom');
      expect(follow.body[2].credits.email_status).toBe('none');

      const failedList = await request(app.getHttpServer())
        .get(`/api/admin/credits/events/${eventId}/follow-up?filter=failed`)
        .set(auth(volunteerToken))
        .expect(200);
      expect(failedList.body.map((r: any) => r.name)).toEqual(['Broken Ben']);
      await request(app.getHttpServer())
        .get(`/api/admin/credits/events/${eventId}/follow-up?filter=bogus`)
        .set(auth(volunteerToken))
        .expect(400);

      const list = (q: string) =>
        request(app.getHttpServer())
          .get(`/api/admin/registrations?event_id=${eventId}&limit=50${q}`)
          .set(auth(organizerToken))
          .expect(200);
      const names = (res: any) =>
        res.body.data.map((r: any) => r.attendee.name).sort();
      expect(names(await list('&credits=redeemed'))).toEqual([
        'Confirmed Carl',
        'Redeemed Rita',
      ]);
      expect(names(await list('&credits=failed'))).toEqual(['Broken Ben']);
      expect(names(await list('&credits=not_redeemed'))).toEqual([
        'Absent Amir',
        'Broken Ben',
        'Norow Nadia',
        'Waiting Wendy',
      ]);
      const all = await list('');
      expect(all.body.total).toBe(6);
      const byName = Object.fromEntries(
        all.body.data.map((r: any) => [r.attendee.name, r.credits]),
      );
      expect(byName['Redeemed Rita']).toMatchObject({
        email_status: 'sent',
        redeemed_via: 'attendee',
      });
      expect(byName['Redeemed Rita'].redeemed_at).toBeTruthy();
      expect(byName['Confirmed Carl']).toMatchObject({
        redeemed_via: 'volunteer',
      });
      expect(byName['Broken Ben']).toMatchObject({
        email_status: 'failed',
        redeemed_at: null,
      });
      expect(byName['Absent Amir']).toBeNull();

      const csv = await request(app.getHttpServer())
        .get(`/api/admin/registrations/export?event_id=${eventId}`)
        .set(auth(organizerToken))
        .expect(200);
      const lines = csv.text.split('\n');
      expect(
        lines[0].endsWith('Registered At,Credits Email,Credits Redeemed At'),
      ).toBe(true);
      const ritaLine = lines.find((l) => l.includes('Redeemed Rita'))!;
      expect(ritaLine).toMatch(
        /,"sent","\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC"$/,
      );
      expect(lines.find((l) => l.includes('Broken Ben'))!).toMatch(
        /,"failed",""$/,
      );
      expect(lines.find((l) => l.includes('Absent Amir'))!).toMatch(/,"",""$/);
    });

    it('QR endpoint returns a data URL, creates a not_sent row and emails nothing', async () => {
      const eventId = await seedEvent();
      const reg = await seedReg(eventId, { checkedIn: true });
      const res = await request(app.getHttpServer())
        .get(`/api/admin/credits/registrations/${reg.id}/qr`)
        .set(auth(volunteerToken))
        .expect(200);
      const row = await rowFor(reg.id);
      expect(row.email_status).toBe('not_sent');
      expect(row.source).toBe('volunteer_qr');
      expect(res.body.confirm_url).toBe(`${ORIGIN}/credits/${row.token}`);
      expect(res.body.qr_data_url).toMatch(/^data:image\/png;base64,/);

      await drain();
      expect(mailer.calls).toHaveLength(0);
      // the attendee lands on a working confirm page
      await publicGet(row.token).expect(200);
      // asking again returns the same link
      const again = await request(app.getHttpServer())
        .get(`/api/admin/credits/registrations/${reg.id}/qr`)
        .set(auth(volunteerToken))
        .expect(200);
      expect(again.body.confirm_url).toBe(res.body.confirm_url);

      // a later "Send credits email" uses the same row and sends once
      await request(app.getHttpServer())
        .post(`/api/admin/credits/registrations/${reg.id}/send`)
        .set(auth(volunteerToken))
        .expect(200);
      expect((await rowFor(reg.id)).email_generation).toBe(1);
      await drain();
      expect(mailer.sent).toHaveLength(1);

      const detail = await request(app.getHttpServer())
        .get(`/api/admin/credits/registrations/${reg.id}`)
        .set(auth(volunteerToken))
        .expect(200);
      expect(detail.body).toMatchObject({
        exists: true,
        email_status: 'sent',
        redeemed: false,
      });
    });

    it('lets a volunteer confirm, only an organizer undo, and applies role checks', async () => {
      const eventId = await seedEvent();
      const reg = await seedReg(eventId, { checkedIn: true });
      const base = `/api/admin/credits/registrations/${reg.id}`;

      await request(app.getHttpServer()).post(`${base}/confirm`).expect(401);

      const confirmed = await request(app.getHttpServer())
        .post(`${base}/confirm`)
        .set(auth(volunteerToken))
        .expect(200);
      expect(confirmed.body).toMatchObject({
        redeemed: true,
        redeemed_via: 'volunteer',
        email_status: 'not_sent',
      });
      const row = await rowFor(reg.id);
      expect(row.redeemed_by_admin_id).toBe(volunteerId);
      expect(mailer.calls).toHaveLength(0);

      // a repeat keeps the first confirmation
      await request(app.getHttpServer())
        .post(`${base}/confirm`)
        .set(auth(organizerToken))
        .expect(200);
      expect((await rowFor(reg.id)).redeemed_by_admin_id).toBe(volunteerId);

      await request(app.getHttpServer())
        .delete(`${base}/confirm`)
        .set(auth(volunteerToken))
        .expect(403);
      expect((await rowFor(reg.id)).redeemed_at).toBeTruthy();
      const undone = await request(app.getHttpServer())
        .delete(`${base}/confirm`)
        .set(auth(organizerToken))
        .expect(200);
      expect(undone.body.redeemed).toBe(false);
      const cleared = await rowFor(reg.id);
      expect(cleared.redeemed_at).toBeNull();
      expect(cleared.redeemed_via).toBeNull();
      expect(cleared.redeemed_by_admin_id).toBeNull();

      // bulk is organizer-only
      await request(app.getHttpServer())
        .post('/api/admin/credits/send-bulk')
        .set(auth(volunteerToken))
        .send({ event_id: eventId })
        .expect(403);
      await request(app.getHttpServer())
        .delete(`${base}/confirm`)
        .set(auth(superToken))
        .expect(200);
    });

    it('bulk-sends to everyone checked in with no email yet, or to the given people, with per-person results', async () => {
      const eventId = await seedEvent();
      const otherEvent = await seedEvent({ title: 'Other event' });
      const a = await seedReg(eventId, { checkedIn: true });
      const b = await seedReg(eventId, { checkedIn: true });
      const already = await seedReg(eventId);
      const notIn = await seedReg(eventId);
      const foreign = await seedReg(otherEvent, { checkedIn: true });
      await scan(already.id).expect(200);
      await drain();
      mailer.reset();

      const bulk = await request(app.getHttpServer())
        .post('/api/admin/credits/send-bulk')
        .set(auth(organizerToken))
        .send({ event_id: eventId })
        .expect(200);
      expect(bulk.body.total).toBe(2);
      expect(
        bulk.body.results.every((r: any) => r.ok && r.status === 'pending'),
      ).toBe(true);
      await drain();
      expect(mailer.sent.map((s) => s.message.to).sort()).toEqual(
        [a.email, b.email].sort(),
      );

      mailer.reset();
      const picked = await request(app.getHttpServer())
        .post('/api/admin/credits/send-bulk')
        .set(auth(organizerToken))
        .send({
          event_id: eventId,
          registration_ids: [
            notIn.id,
            foreign.id,
            '00000000-0000-4000-8000-000000000000',
          ],
        })
        .expect(200);
      const byId = Object.fromEntries(
        picked.body.results.map((r: any) => [r.registration_id, r]),
      );
      expect(byId[notIn.id].ok).toBe(true);
      expect(byId[foreign.id].ok).toBe(false);
      expect(byId['00000000-0000-4000-8000-000000000000'].ok).toBe(false);
      await drain();
      expect(mailer.sent.map((s) => s.message.to)).toEqual([notIn.email]);

      await request(app.getHttpServer())
        .post('/api/admin/credits/send-bulk')
        .set(auth(organizerToken))
        .send({ event_id: 'not-a-uuid' })
        .expect(400);
    });

    it('refuses an admin send when credits are off or the event has no claim URL', async () => {
      const off = await seedReg(await seedEvent({ enabled: false }), {
        checkedIn: true,
      });
      const noUrl = await seedReg(await seedEvent({ claim: null }), {
        checkedIn: true,
      });
      for (const r of [off, noUrl]) {
        await request(app.getHttpServer())
          .post(`/api/admin/credits/registrations/${r.id}/send`)
          .set(auth(volunteerToken))
          .expect(400);
      }
      expect(await rowCount()).toBe(0);
      await request(app.getHttpServer())
        .post(
          '/api/admin/credits/registrations/00000000-0000-4000-8000-000000000000/send',
        )
        .set(auth(volunteerToken))
        .expect(404);
    });
  });
});
