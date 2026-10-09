/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- raw SQL rows and untyped request bodies */
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CREDITS_MAILER } from './credits.mailer';
import type { CreditsMailer, CreditsSendResult } from './credits.mailer';
import { renderCreditsEmail, firstNameOf } from './credits-email.template';
import {
  MAX_EMAIL_ATTEMPTS,
  backoffMs,
  emailsPerSecond,
  siteOrigin,
} from './credits.util';

const TICK_INTERVAL_MS = 1000;
/** A row stuck in `sending` this long was claimed by a process that died. */
const STALE_SENDING_MINUTES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * In-process sender for the credits email queue. Every second it reclaims
 * stale `sending` rows, claims due `pending` rows (FOR UPDATE SKIP LOCKED, so
 * several instances never take the same row) and sends them one at a time,
 * spaced to stay under CREDITS_EMAIL_PER_SECOND.
 */
@Injectable()
export class CreditsSender implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CreditsSender.name);
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private lastSendStartedAt = 0;

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    @Inject(CREDITS_MAILER) private readonly mailer: CreditsMailer,
  ) {}

  onModuleInit() {
    if (process.env.CREDITS_WORKER_ENABLED === 'false') {
      this.logger.log(
        'Credits email worker disabled (CREDITS_WORKER_ENABLED=false)',
      );
      return;
    }
    this.timer = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.error(`Credits sender tick failed: ${err?.message ?? err}`),
      );
    }, TICK_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async rows(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.db.query(sql, params);
    return Array.isArray(result) &&
      result.length === 2 &&
      Array.isArray(result[0]) &&
      typeof result[1] === 'number'
      ? result[0]
      : result;
  }

  /**
   * One pass: reclaim, claim up to CREDITS_EMAIL_PER_SECOND due rows, send them.
   * Returns how many rows were processed (0 means nothing was due). Public so
   * tests can drive the worker without timers; overlapping calls are skipped.
   */
  async tick(): Promise<number> {
    if (this.ticking) return 0;
    this.ticking = true;
    try {
      const perSecond = emailsPerSecond();
      const spacingMs = 1000 / perSecond;

      await this.rows(
        `UPDATE credit_redemptions SET email_status = 'pending', updated_at = now()
          WHERE email_status = 'sending' AND updated_at < now() - interval '${STALE_SENDING_MINUTES} minutes'`,
      );

      const claimed = await this.rows(
        `UPDATE credit_redemptions SET email_status = 'sending', email_attempts = email_attempts + 1, updated_at = now()
          WHERE id IN (
            SELECT id FROM credit_redemptions
             WHERE email_status = 'pending' AND (email_next_attempt_at IS NULL OR email_next_attempt_at <= now())
             ORDER BY email_queued_at ASC NULLS FIRST, created_at ASC
             LIMIT $1
             FOR UPDATE SKIP LOCKED)
          RETURNING id, email_attempts, email_generation`,
        [Math.max(1, Math.ceil(perSecond))],
      );

      for (const claim of claimed) {
        const wait = this.lastSendStartedAt + spacingMs - Date.now();
        if (wait > 0) await sleep(wait);
        this.lastSendStartedAt = Date.now();
        await this.process(claim);
      }
      return claimed.length;
    } finally {
      this.ticking = false;
    }
  }

  private async process(claim: {
    id: string;
    email_attempts: number;
    email_generation: number;
  }) {
    let result: CreditsSendResult;
    try {
      result = await this.attempt(claim);
    } catch (err) {
      result = {
        ok: false,
        retryable: true,
        error: `unexpected: ${(err as Error).message}`,
      };
    }
    await this.record(claim, result);
  }

  private async attempt(claim: {
    id: string;
    email_generation: number;
  }): Promise<CreditsSendResult> {
    const [row] = await this.rows(
      `SELECT cr.token, r.deleted_at, a.name, a.email, e.title, e.credits_claim_url, e.credits_video_url
         FROM credit_redemptions cr
         JOIN registrations r ON r.id = cr.registration_id
         JOIN attendees a ON a.id = r.attendee_id
         JOIN events e ON e.id = cr.event_id
        WHERE cr.id = $1`,
      [claim.id],
    );
    if (!row)
      return {
        ok: false,
        retryable: false,
        error: 'Registration no longer exists',
      };
    if (row.deleted_at)
      return { ok: false, retryable: false, error: 'Registration was deleted' };
    if (!row.credits_claim_url)
      return {
        ok: false,
        retryable: false,
        error: 'Event has no credits claim URL',
      };

    const origin = siteOrigin();
    const message = renderCreditsEmail({
      firstName: firstNameOf(row.name),
      eventTitle: row.title,
      claimUrl: `${origin}/api/public/credits/${row.token}/claim`,
      videoUrl: row.credits_video_url
        ? `${origin}/api/public/credits/${row.token}/video`
        : null,
      confirmUrl: `${origin}/credits/${row.token}`,
      thumbnailUrl: `${origin}/images/credits-video-thumb.png`,
    });
    return this.mailer.send(
      {
        to: row.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
      },
      { idempotencyKey: `credits-${claim.id}-${claim.email_generation}` },
    );
  }

  /** Writes the outcome, unless an admin resend changed the row while we were sending. */
  private async record(
    claim: { id: string; email_attempts: number; email_generation: number },
    result: CreditsSendResult,
  ) {
    const guard = `WHERE id = $1 AND email_status = 'sending' AND email_generation = $2`;
    if (result.ok) {
      await this.rows(
        `UPDATE credit_redemptions SET email_status = 'sent', email_sent_at = now(), email_last_error = NULL,
                email_next_attempt_at = NULL, updated_at = now() ${guard}`,
        [claim.id, claim.email_generation],
      );
      return;
    }
    const delay =
      result.retryable && claim.email_attempts < MAX_EMAIL_ATTEMPTS
        ? backoffMs(claim.email_attempts)
        : null;
    if (delay !== null) {
      await this.rows(
        `UPDATE credit_redemptions SET email_status = 'pending', email_last_error = $3,
                email_next_attempt_at = now() + ($4 || ' milliseconds')::interval, updated_at = now() ${guard}`,
        [claim.id, claim.email_generation, result.error, String(delay)],
      );
      return;
    }
    this.logger.warn(`Credits email ${claim.id} failed: ${result.error}`);
    await this.rows(
      `UPDATE credit_redemptions SET email_status = 'failed', email_last_error = $3,
              email_next_attempt_at = NULL, updated_at = now() ${guard}`,
      [claim.id, claim.email_generation, result.error],
    );
  }
}
