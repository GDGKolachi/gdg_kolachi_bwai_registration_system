/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- raw SQL rows and supertest bodies are untyped */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as QRCode from 'qrcode';
import { generateToken, siteOrigin } from './credits.util';

export type CreditSource =
  | 'qr_scan'
  | 'hackathon_scan'
  | 'admin'
  | 'volunteer_qr'
  | 'self_checkin';

/** Minimum gap between self-service resends for the same person. */
export const RESEND_COOLDOWN_MINUTES = 2;

export const SELF_RESEND_MESSAGE =
  "If you're checked in, we've sent the email again. Check your inbox and spam folder in a minute or two.";

export interface CreditsView {
  exists: boolean;
  email_status: string;
  email_attempts: number | null;
  email_last_error: string | null;
  email_queued_at: Date | null;
  email_sent_at: Date | null;
  confirm_page_opened_at: Date | null;
  claim_clicked_at: Date | null;
  video_clicked_at: Date | null;
  redeemed: boolean;
  redeemed_at: Date | null;
  redeemed_via: string | null;
}

function toView(row: any): CreditsView {
  if (!row) {
    return {
      exists: false,
      email_status: 'none',
      email_attempts: null,
      email_last_error: null,
      email_queued_at: null,
      email_sent_at: null,
      confirm_page_opened_at: null,
      claim_clicked_at: null,
      video_clicked_at: null,
      redeemed: false,
      redeemed_at: null,
      redeemed_via: null,
    };
  }
  return {
    exists: true,
    email_status: row.email_status,
    email_attempts: row.email_attempts,
    email_last_error: row.email_last_error,
    email_queued_at: row.email_queued_at,
    email_sent_at: row.email_sent_at,
    confirm_page_opened_at: row.confirm_page_opened_at,
    claim_clicked_at: row.claim_clicked_at,
    video_clicked_at: row.video_clicked_at,
    redeemed: !!row.redeemed_at,
    redeemed_at: row.redeemed_at,
    redeemed_via: row.redeemed_via,
  };
}

/** TypeORM's postgres `query()` returns [rows, count] for UPDATE/DELETE ... RETURNING. */
function rowsOf(result: any): any[] {
  if (
    Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === 'number'
  ) {
    return result[0];
  }
  return result;
}

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  private async q(sql: string, params: any[] = []): Promise<any[]> {
    return rowsOf(await this.db.query(sql, params));
  }

  // ---------------------------------------------------------------- queueing

  /**
   * Called after a QR-scan check-in has been saved. Inserts the credits row
   * (one per registration, so re-scans never queue a second email) when the
   * event has credits on and a claim URL, and the registration is live and
   * checked in. NEVER throws: check-in must not depend on this.
   */
  async queueOnCheckin(
    registrationId: string,
    source: CreditSource,
    adminId?: string | null,
  ): Promise<{ status: string }> {
    try {
      const [reg] = await this.q(
        `SELECT r.checked_in, r.deleted_at, e.id AS event_id, e.credits_enabled, e.credits_claim_url
           FROM registrations r JOIN events e ON e.id = r.event_id
          WHERE r.id = $1`,
        [registrationId],
      );
      if (
        !reg ||
        reg.deleted_at ||
        !reg.checked_in ||
        !reg.credits_enabled ||
        !reg.credits_claim_url
      ) {
        return { status: await this.currentStatus(registrationId) };
      }
      await this.q(
        `INSERT INTO credit_redemptions
           (registration_id, event_id, token, source, created_by_admin_id, email_status, email_queued_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', now())
         ON CONFLICT (registration_id) DO UPDATE SET
           email_status = 'pending', email_queued_at = now(), email_attempts = 0,
           email_next_attempt_at = NULL, updated_at = now()
         WHERE credit_redemptions.email_status = 'not_sent'`,
        [
          registrationId,
          reg.event_id,
          generateToken(),
          source,
          adminId ?? null,
        ],
      );
      return { status: await this.currentStatus(registrationId) };
    } catch (err) {
      this.logger.error(
        `Could not queue credits email for ${registrationId}: ${(err as Error).message}`,
      );
      return { status: 'queue_error' };
    }
  }

  /** `<origin>/credits/<token>` for the registration's credits row, or null when there is none. */
  async confirmUrlFor(registrationId: string): Promise<string | null> {
    const row = await this.getRow(registrationId);
    return row ? `${siteOrigin()}/credits/${row.token}` : null;
  }

  /** Email status of the registration's credits row, or `not_queued`. */
  async currentStatus(registrationId: string): Promise<string> {
    try {
      const [row] = await this.q(
        `SELECT email_status FROM credit_redemptions WHERE registration_id = $1`,
        [registrationId],
      );
      return row?.email_status ?? 'not_queued';
    } catch {
      return 'not_queued';
    }
  }

  // --------------------------------------------------------------- admin ops

  private async loadRegistration(registrationId: string) {
    const [reg] = await this.q(
      `SELECT r.id, r.event_id, r.checked_in, r.deleted_at, a.email, a.name,
              e.credits_enabled, e.credits_claim_url
         FROM registrations r
         JOIN attendees a ON a.id = r.attendee_id
         JOIN events e ON e.id = r.event_id
        WHERE r.id = $1`,
      [registrationId],
    );
    if (!reg || reg.deleted_at)
      throw new NotFoundException('Registration not found');
    return reg;
  }

  private async insertRow(
    reg: { id: string; event_id: string },
    source: CreditSource,
    adminId: string | null,
    status: 'pending' | 'not_sent',
  ) {
    await this.q(
      `INSERT INTO credit_redemptions
         (registration_id, event_id, token, source, created_by_admin_id, email_status, email_queued_at)
       VALUES ($1, $2, $3, $4, $5, $6, ${status === 'pending' ? 'now()' : 'NULL'})
       ON CONFLICT (registration_id) DO NOTHING`,
      [reg.id, reg.event_id, generateToken(), source, adminId, status],
    );
  }

  private async getRow(registrationId: string) {
    const [row] = await this.q(
      `SELECT * FROM credit_redemptions WHERE registration_id = $1`,
      [registrationId],
    );
    return row ?? null;
  }

  /** Puts a sent / failed / never-sent row back in the queue. Null if it was already in flight. */
  private async requeue(registrationId: string, cooldown: boolean) {
    const rows = await this.q(
      `UPDATE credit_redemptions SET
           email_generation = email_generation + (CASE WHEN email_status = 'not_sent' THEN 0 ELSE 1 END),
           email_status = 'pending', email_attempts = 0, email_next_attempt_at = NULL,
           email_queued_at = now(), email_last_error = NULL, updated_at = now()
         WHERE registration_id = $1 AND email_status IN ('sent', 'failed', 'not_sent')
           ${cooldown ? `AND (email_queued_at IS NULL OR email_queued_at < now() - interval '${RESEND_COOLDOWN_MINUTES} minutes')` : ''}
         RETURNING *`,
      [registrationId],
    );
    return rows[0] ?? null;
  }

  /** First send or resend for one registration (desk button, failed-row Resend button). */
  async send(
    registrationId: string,
    adminId: string | null,
    source: CreditSource = 'admin',
  ): Promise<CreditsView> {
    const reg = await this.loadRegistration(registrationId);
    if (!reg.credits_enabled)
      throw new BadRequestException(
        'Credits email is not enabled for this event.',
      );
    if (!reg.credits_claim_url)
      throw new BadRequestException('This event has no credits claim URL.');
    await this.insertRow(reg, source, adminId, 'pending');
    await this.requeue(registrationId, false); // no-op for a row we just created or one already in flight
    return toView(await this.getRow(registrationId));
  }

  async sendBulk(
    eventId: string,
    registrationIds: string[] | undefined,
    adminId: string | null,
  ) {
    const [event] = await this.q(
      `SELECT id, credits_enabled, credits_claim_url FROM events WHERE id = $1`,
      [eventId],
    );
    if (!event) throw new NotFoundException('Event not found');
    if (!event.credits_enabled)
      throw new BadRequestException(
        'Credits email is not enabled for this event.',
      );
    if (!event.credits_claim_url)
      throw new BadRequestException('This event has no credits claim URL.');

    let ids = registrationIds;
    if (!ids || ids.length === 0) {
      const rows = await this.q(
        `SELECT r.id FROM registrations r
           LEFT JOIN credit_redemptions cr ON cr.registration_id = r.id
          WHERE r.event_id = $1 AND r.checked_in = true AND r.deleted_at IS NULL
            AND (cr.id IS NULL OR cr.email_status = 'not_sent')
          ORDER BY r.checked_in_at ASC`,
        [eventId],
      );
      ids = rows.map((r) => r.id);
    }

    const results: Array<{
      registration_id: string;
      ok: boolean;
      status?: string;
      error?: string;
    }> = [];
    for (const id of ids) {
      try {
        const [owner] = await this.q(
          `SELECT event_id FROM registrations WHERE id = $1`,
          [id],
        );
        if (!owner || owner.event_id !== eventId)
          throw new NotFoundException('Registration not found in this event');
        const view = await this.send(id, adminId, 'admin');
        results.push({
          registration_id: id,
          ok: true,
          status: view.email_status,
        });
      } catch (err) {
        results.push({
          registration_id: id,
          ok: false,
          error: (err as Error).message,
        });
      }
    }
    return {
      total: results.length,
      queued: results.filter((r) => r.ok).length,
      results,
    };
  }

  /** Creates the row without emailing (for "Show credits QR") and returns the confirm link. */
  async qr(registrationId: string, adminId: string) {
    const reg = await this.loadRegistration(registrationId);
    await this.insertRow(reg, 'volunteer_qr', adminId, 'not_sent');
    const row = await this.getRow(registrationId);
    const confirm_url = `${siteOrigin()}/credits/${row.token}`;
    const qr_data_url = await QRCode.toDataURL(confirm_url, {
      width: 320,
      margin: 2,
    });
    return { confirm_url, qr_data_url };
  }

  /** The "Didn't get the email?" page for an event, with a QR for the projector. */
  async resendQr(eventId: string) {
    const [event] = await this.q(`SELECT id FROM events WHERE id = $1`, [
      eventId,
    ]);
    if (!event) throw new NotFoundException('Event not found');
    const url = `${siteOrigin()}/credits/resend?event=${eventId}`;
    const qr_data_url = await QRCode.toDataURL(url, { width: 480, margin: 2 });
    return { url, qr_data_url };
  }

  async getForRegistration(registrationId: string): Promise<CreditsView> {
    await this.loadRegistration(registrationId);
    return toView(await this.getRow(registrationId));
  }

  /** Volunteer-confirmed redemption. Keeps the first redemption if there already is one. */
  async confirm(registrationId: string, adminId: string): Promise<CreditsView> {
    const reg = await this.loadRegistration(registrationId);
    await this.insertRow(reg, 'admin', adminId, 'not_sent');
    await this.q(
      `UPDATE credit_redemptions SET redeemed_at = now(), redeemed_via = 'volunteer',
              redeemed_by_admin_id = $2, updated_at = now()
        WHERE registration_id = $1 AND redeemed_at IS NULL`,
      [registrationId, adminId],
    );
    return toView(await this.getRow(registrationId));
  }

  async unconfirm(registrationId: string): Promise<CreditsView> {
    await this.loadRegistration(registrationId);
    const row = await this.getRow(registrationId);
    if (!row)
      throw new NotFoundException('No credits record for this registration');
    await this.q(
      `UPDATE credit_redemptions SET redeemed_at = NULL, redeemed_via = NULL,
              redeemed_by_admin_id = NULL, updated_at = now()
        WHERE registration_id = $1`,
      [registrationId],
    );
    return toView(await this.getRow(registrationId));
  }

  async summary(eventId: string) {
    const [event] = await this.q(`SELECT id FROM events WHERE id = $1`, [
      eventId,
    ]);
    if (!event) throw new NotFoundException('Event not found');
    const [counts] = await this.q(
      `SELECT
         count(*) FILTER (WHERE r.checked_in)::int AS checked_in,
         count(cr.id) FILTER (WHERE cr.email_status = 'not_sent')::int AS not_sent,
         count(cr.id) FILTER (WHERE cr.email_status = 'pending')::int AS pending,
         count(cr.id) FILTER (WHERE cr.email_status = 'sending')::int AS sending,
         count(cr.id) FILTER (WHERE cr.email_status = 'sent')::int AS sent,
         count(cr.id) FILTER (WHERE cr.email_status = 'failed')::int AS failed,
         count(cr.confirm_page_opened_at)::int AS confirm_page_opened,
         count(cr.claim_clicked_at)::int AS claim_clicks,
         count(cr.video_clicked_at)::int AS video_clicks,
         count(cr.redeemed_at)::int AS redeemed,
         count(cr.redeemed_at) FILTER (WHERE cr.redeemed_via = 'attendee')::int AS redeemed_attendee,
         count(cr.redeemed_at) FILTER (WHERE cr.redeemed_via = 'volunteer')::int AS redeemed_volunteer
       FROM registrations r
       LEFT JOIN credit_redemptions cr ON cr.registration_id = r.id
       WHERE r.event_id = $1 AND r.deleted_at IS NULL`,
      [eventId],
    );
    return {
      event_id: eventId,
      checked_in: counts.checked_in,
      emails: {
        not_sent: counts.not_sent,
        pending: counts.pending,
        sending: counts.sending,
        sent: counts.sent,
        failed: counts.failed,
      },
      confirm_page_opened: counts.confirm_page_opened,
      claim_clicks: counts.claim_clicks,
      video_clicks: counts.video_clicks,
      redeemed: {
        total: counts.redeemed,
        attendee: counts.redeemed_attendee,
        volunteer: counts.redeemed_volunteer,
      },
    };
  }

  /** Checked-in attendees who have not redeemed (or whose email failed), oldest check-in first. */
  async followUp(eventId: string, filter: string | undefined) {
    const mode = filter || 'not_redeemed';
    if (mode !== 'not_redeemed' && mode !== 'failed') {
      throw new BadRequestException('filter must be not_redeemed or failed');
    }
    const rows = await this.q(
      `SELECT r.id AS registration_id, r.checked_in_at, a.name, a.email,
              cr.email_status, cr.email_last_error, cr.claim_clicked_at, cr.video_clicked_at,
              cr.redeemed_at, cr.redeemed_via
         FROM registrations r
         JOIN attendees a ON a.id = r.attendee_id
         LEFT JOIN credit_redemptions cr ON cr.registration_id = r.id
        WHERE r.event_id = $1 AND r.deleted_at IS NULL AND r.checked_in = true
          AND ${mode === 'failed' ? `cr.email_status = 'failed'` : 'cr.redeemed_at IS NULL'}
        ORDER BY r.checked_in_at ASC NULLS LAST, a.name ASC`,
      [eventId],
    );
    const now = Date.now();
    return rows.map((r) => ({
      registration_id: r.registration_id,
      name: r.name,
      email: r.email,
      checked_in_at: r.checked_in_at,
      minutes_since_check_in: r.checked_in_at
        ? Math.max(
            0,
            Math.floor((now - new Date(r.checked_in_at).getTime()) / 60000),
          )
        : null,
      credits: {
        email_status: r.email_status ?? 'none',
        email_last_error: r.email_last_error ?? null,
        claim_clicked_at: r.claim_clicked_at ?? null,
        video_clicked_at: r.video_clicked_at ?? null,
        redeemed_at: r.redeemed_at ?? null,
        redeemed_via: r.redeemed_via ?? null,
      },
    }));
  }

  // ------------------------------------------------------------------ public

  private async findByToken(token: string) {
    // Tokens are 43 chars of base64url; reject anything else without hitting the DB.
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(token))
      throw new NotFoundException('Not found');
    const [row] = await this.q(
      `SELECT cr.id, cr.token, cr.redeemed_at, a.name, e.title AS event_title,
              e.credits_claim_url, e.credits_video_url
         FROM credit_redemptions cr
         JOIN registrations r ON r.id = cr.registration_id AND r.deleted_at IS NULL
         JOIN attendees a ON a.id = r.attendee_id
         JOIN events e ON e.id = cr.event_id
        WHERE cr.token = $1`,
      [token],
    );
    if (!row) throw new NotFoundException('Not found');
    return row;
  }

  private trackedUrl(token: string, kind: 'claim' | 'video') {
    return `${siteOrigin()}/api/public/credits/${token}/${kind}`;
  }

  async publicGet(token: string) {
    const row = await this.findByToken(token);
    await this.q(
      `UPDATE credit_redemptions SET confirm_page_opened_at = COALESCE(confirm_page_opened_at, now()) WHERE id = $1`,
      [row.id],
    );
    return {
      first_name: (row.name || '').trim().split(/\s+/)[0] || '',
      event_title: row.event_title,
      claim_url: row.credits_claim_url ? this.trackedUrl(token, 'claim') : null,
      video_url: row.credits_video_url ? this.trackedUrl(token, 'video') : null,
      redeemed: !!row.redeemed_at,
      redeemed_at: row.redeemed_at,
    };
  }

  async redeem(token: string) {
    const row = await this.findByToken(token);
    const [updated] = await this.q(
      `UPDATE credit_redemptions SET redeemed_at = COALESCE(redeemed_at, now()),
              redeemed_via = COALESCE(redeemed_via, 'attendee'), updated_at = now()
        WHERE id = $1 RETURNING redeemed_at`,
      [row.id],
    );
    return { redeemed: true, redeemed_at: updated.redeemed_at };
  }

  /** Records the first click and returns where to send the attendee. */
  async trackClick(token: string, kind: 'claim' | 'video'): Promise<string> {
    const row = await this.findByToken(token);
    const url =
      kind === 'claim' ? row.credits_claim_url : row.credits_video_url;
    if (!url) throw new NotFoundException('Not found');
    const col = kind === 'claim' ? 'claim_clicked_at' : 'video_clicked_at';
    await this.q(
      `UPDATE credit_redemptions SET ${col} = COALESCE(${col}, now()) WHERE id = $1`,
      [row.id],
    );
    return url;
  }

  /**
   * "Didn't get the email?" Re-queues only an existing row for a checked-in
   * registration with this email, at most once per cooldown. The answer is the
   * same whatever happened so it reveals nothing about who is registered.
   */
  async selfResend(
    email: string,
    eventId: string,
  ): Promise<{ message: string }> {
    try {
      const [row] = await this.q(
        `SELECT r.id, e.credits_enabled, e.credits_claim_url
           FROM registrations r
           JOIN attendees a ON a.id = r.attendee_id
           JOIN events e ON e.id = r.event_id
           JOIN credit_redemptions cr ON cr.registration_id = r.id
          WHERE r.event_id = $1 AND LOWER(a.email) = LOWER($2)
            AND r.deleted_at IS NULL AND r.checked_in = true`,
        [eventId, email.trim()],
      );
      if (row && row.credits_enabled && row.credits_claim_url) {
        await this.requeue(row.id, true);
      }
    } catch (err) {
      this.logger.error(
        `Self-service credits resend failed: ${(err as Error).message}`,
      );
    }
    return { message: SELF_RESEND_MESSAGE };
  }
}
