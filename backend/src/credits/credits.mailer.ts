/* eslint-disable @typescript-eslint/no-unsafe-member-access -- raw SQL rows and untyped request bodies */
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { RESEND_TIMEOUT_MS, TimeoutError, withTimeout } from './credits.util';

/** Injection token so tests can swap the real Resend mailer for a fake. */
export const CREDITS_MAILER = 'CREDITS_MAILER';

export interface CreditsEmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Inline (CID) attachments, same shape email.service.ts uses for its QR code. */
  attachments?: { filename: string; content: Buffer; contentId: string }[];
}

export type CreditsSendResult =
  | { ok: true; id?: string }
  | { ok: false; retryable: boolean; error: string };

export interface CreditsMailer {
  send(
    message: CreditsEmailMessage,
    options: { idempotencyKey: string },
  ): Promise<CreditsSendResult>;
}

const FROM = 'GDG Kolachi <hello@gdgkolachi.com>';

/**
 * Resend-backed mailer for the credits email. Has its own client (the shared
 * EmailService is deliberately untouched). Classifies failures: rate limits,
 * 5xx and network errors are retryable; validation errors are not.
 */
@Injectable()
export class ResendCreditsMailer implements CreditsMailer {
  private readonly logger = new Logger(ResendCreditsMailer.name);

  async send(
    message: CreditsEmailMessage,
    options: { idempotencyKey: string },
  ): Promise<CreditsSendResult> {
    // Read at send time so a key added after boot is picked up, and a missing
    // key is a visible failure rather than a silent skip.
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        retryable: false,
        error: 'RESEND_API_KEY is not set',
      };
    }
    try {
      const resend = new Resend(apiKey);
      // A timeout is retryable: if Resend did accept the timed-out request, the
      // retry carries the same idempotency key and is a no-op on their side.
      const { data, error } = await withTimeout(
        resend.emails.send(
          {
            from: FROM,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(message.attachments?.length
              ? { attachments: message.attachments }
              : {}),
          },
          { idempotencyKey: options.idempotencyKey },
        ),
        RESEND_TIMEOUT_MS,
      );
      if (error) {
        const status = (error as any).statusCode as number | null | undefined;
        const name = (error as any).name as string | undefined;
        // Rate limits (429), concurrent idempotent request (409), 5xx and
        // transport errors (no status) retry; other 4xx (validation, bad key,
        // bad address) will never succeed as written.
        const retryable =
          status == null || status === 429 || status === 409 || status >= 500;
        return {
          ok: false,
          retryable,
          error: `${name ?? 'error'}: ${error.message}`,
        };
      }
      return { ok: true, id: data?.id };
    } catch (err) {
      if (err instanceof TimeoutError) {
        return { ok: false, retryable: true, error: err.message };
      }
      this.logger.warn(`Resend threw: ${(err as Error).message}`);
      return {
        ok: false,
        retryable: true,
        error: `network: ${(err as Error).message}`,
      };
    }
  }
}
