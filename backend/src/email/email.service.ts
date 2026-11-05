import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailTemplatesService } from './email-templates.service';
import { RenderedEmail } from './templates/render';
import { buildAttachments, FROM_ADDRESS } from './templates/attachments';
import { DepositInfo, EmailEvent } from './templates/email-types';
import { siteOrigin } from '../credits/credits.util';

type Recipient = { email: string; name: string };

/**
 * Sends every attendee email. What each one says and looks like lives in
 * src/email/templates (one definition per type, themed) and the admin's
 * overrides in EmailTemplatesService; this class only decides who gets what
 * and reports what was sent.
 */
@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from = FROM_ADDRESS;

  constructor(private readonly templates: EmailTemplatesService) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not set — emails will not be sent');
      return;
    }
    this.resend = new Resend(apiKey);
    this.logger.log('Resend email service initialized');
  }

  private acknowledgeUrl(registrationId: string): string {
    return `${siteOrigin()}/api/registrations/${registrationId}/acknowledge`;
  }

  /** One message: rendered HTML + text, with its CID attachments (QR, thumbnail). */
  private async message(
    to: string,
    rendered: RenderedEmail,
    extra: { cc?: string[]; subject?: string } = {},
  ) {
    const attachments = await buildAttachments(rendered.attachments);
    return {
      from: this.from,
      to: [to],
      ...(extra.cc && extra.cc.length > 0 ? { cc: extra.cc } : {}),
      subject: extra.subject ?? rendered.subject,
      html: rendered.html,
      text: rendered.text,
      ...(attachments.length > 0 ? { attachments } : {}),
    };
  }

  /** Sends one message; returns the id or the error, never throws. */
  private async deliver(
    msg: Awaited<ReturnType<EmailService['message']>>,
    label: string,
  ) {
    try {
      const { data, error } = await this.resend.emails.send(msg);
      if (error) {
        this.logger.error(`${label} email failed for ${msg.to[0]}`, error);
        return { ok: false as const, error: String(error.message ?? error) };
      }
      this.logger.log(`${label} email sent to ${msg.to[0]}, id: ${data.id}`);
      return { ok: true as const, id: data.id };
    } catch (err) {
      this.logger.error(`${label} email exception for ${msg.to[0]}`, err);
      return { ok: false as const, error: (err as Error).message };
    }
  }

  /** For test sends from the admin: an already-rendered email to one address. */
  async sendRendered(to: string, rendered: RenderedEmail, subject?: string) {
    if (!this.resend)
      return {
        ok: false as const,
        error: 'RESEND_API_KEY is not set on the server',
      };
    return this.deliver(await this.message(to, rendered, { subject }), 'Test');
  }

  // Sent when admin shortlists — QR ticket (in person) or join card (online) + confirm button
  async sendShortlistedEmail(
    email: string,
    name: string,
    event: EmailEvent,
    registrationId: string,
    qrData: string,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email');
      return;
    }
    const rendered = await this.templates.render(
      'shortlisted',
      {
        name,
        event,
        registrationId,
        acknowledgeUrl: this.acknowledgeUrl(registrationId),
        qrData,
      },
      event,
    );
    await this.deliver(await this.message(email, rendered), 'Shortlisted');
  }

  // Batch send — used when bulk shortlisting
  async sendShortlistedBatch(
    recipients: Array<
      Recipient & { event: EmailEvent; registrationId: string; qrData: string }
    >,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping batch');
      return;
    }
    for (const r of recipients) {
      await this.sendShortlistedEmail(
        r.email,
        r.name,
        r.event,
        r.registrationId,
        r.qrData,
      );
    }
  }

  // Reminder email — re-sends entry pass (QR) or join card + event instructions + an admin-written note.
  async sendReminderBatch(
    recipients: Array<
      Recipient & { event: EmailEvent; registrationId: string; qrData: string }
    >,
    customMessage: string,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping reminder batch');
      return { sent: 0 };
    }
    let sent = 0;
    for (const r of recipients) {
      const rendered = await this.templates.render(
        'reminder',
        {
          name: r.name,
          event: r.event,
          registrationId: r.registrationId,
          acknowledgeUrl: this.acknowledgeUrl(r.registrationId),
          qrData: r.qrData || null,
          customMessage,
        },
        r.event,
      );
      if (
        (await this.deliver(await this.message(r.email, rendered), 'Reminder'))
          .ok
      )
        sent++;
    }
    return { sent };
  }

  /**
   * Nothing but the group link, a button to it, and whatever short note the
   * admin added, so the link is findable in an inbox.
   */
  async sendWhatsappGroupBatch(
    recipients: Array<
      Recipient & { event: { title: string; email_theme?: string | null } }
    >,
    groupUrl: string,
    customMessage = '',
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping WhatsApp group batch');
      return { sent: 0, failedEmails: recipients.map((r) => r.email) };
    }
    let sent = 0;
    const failedEmails: string[] = [];
    for (const r of recipients) {
      const rendered = await this.templates.render(
        'whatsapp_group',
        { name: r.name, event: r.event, groupUrl, customMessage },
        r.event,
      );
      if (
        (
          await this.deliver(
            await this.message(r.email, rendered),
            'WhatsApp group',
          )
        ).ok
      )
        sent++;
      else failedEmails.push(r.email);
    }
    return { sent, failedEmails };
  }

  /**
   * The automatic "starting soon" email for an online session (see
   * OnlineReminderScheduler). Sent through Resend's batch API, 100 per call,
   * so a thousand attendees take ten calls and the email still lands before
   * the session starts. It has no attachments, which batch does not support.
   */
  async sendMeetingReminderBatch(
    recipients: Array<Recipient & { registrationId: string; joinUrl: string }>,
    event: EmailEvent & {
      startsAtText: string;
      minutesUntilStart: number | null;
    },
  ) {
    if (!this.resend) {
      this.logger.warn(
        'Resend not configured, skipping meeting reminder batch',
      );
      return { sent: 0, failed: recipients.length };
    }
    const batchSize = 100;
    let sent = 0;
    let failed = 0;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize);
      const messages = await Promise.all(
        chunk.map(async (r) => {
          const rendered = await this.templates.render(
            'meeting_reminder',
            {
              name: r.name,
              event,
              joinUrl: r.joinUrl,
              startsAtText: event.startsAtText,
              minutesUntilStart: event.minutesUntilStart,
            },
            event,
          );
          return {
            from: this.from,
            to: [r.email],
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          };
        }),
      );
      try {
        const { error } = await this.resend.batch.send(messages);
        if (error) {
          failed += chunk.length;
          this.logger.error(
            `Meeting reminder batch failed for ${i}–${i + chunk.length}`,
            error,
          );
        } else {
          sent += chunk.length;
          this.logger.log(
            `Meeting reminder batch sent ${chunk.length} emails for "${event.title}"`,
          );
        }
      } catch (err) {
        failed += chunk.length;
        this.logger.error(
          `Meeting reminder batch exception for ${i}–${i + chunk.length}`,
          err,
        );
      }
      // Stay under Resend's default 2 requests/second.
      if (i + batchSize < recipients.length)
        await new Promise((r) => setTimeout(r, 600));
    }
    return { sent, failed };
  }

  async sendRejectionEmail(
    email: string,
    name: string,
    event: { title: string; email_theme?: string | null },
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping rejection email');
      return;
    }
    const rendered = await this.templates.render(
      'rejection',
      { name, event, customMessage: '' },
      event,
    );
    await this.deliver(await this.message(email, rendered), 'Rejection');
  }

  /**
   * `customMessage` is the organisers' own words for this round. It sits after
   * the standard paragraph rather than replacing it, so the reason a rejection
   * exists is always stated even when nobody writes anything.
   */
  async sendRejectionBatch(
    recipients: Array<
      Recipient & { event: { title: string; email_theme?: string | null } }
    >,
    customMessage = '',
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping rejection batch');
      return { sent: 0 };
    }
    const batchSize = 100;
    let sent = 0;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize);
      const messages = await Promise.all(
        chunk.map(async (r) => {
          const rendered = await this.templates.render(
            'rejection',
            { name: r.name, event: r.event, customMessage },
            r.event,
          );
          return {
            from: this.from,
            to: [r.email],
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          };
        }),
      );
      const { data, error } = await this.resend.batch.send(messages);
      if (error) {
        this.logger.error(
          `Rejection batch send failed for chunk ${i}–${i + chunk.length}`,
          error,
        );
      } else {
        sent += chunk.length;
        this.logger.log(
          `Rejection batch sent ${chunk.length} emails, ids: ${data.data.map((d) => d.id).join(', ')}`,
        );
      }
    }
    return { sent };
  }

  /**
   * Deposit request for a selected team. Addressed to the captain, who pays,
   * with the rest of the roster on CC so nobody's seat quietly depends on a
   * teammate they cannot see. The deposit is one flat amount for the team.
   */
  async sendTeamPaymentRequestEmail(params: {
    captainEmail: string;
    captainName: string;
    memberEmails: string[];
    teamLabel: string;
    memberCount: number;
    eventTitle: string;
    deadline: Date;
    submitUrl: string;
    deposit: DepositInfo;
    event?: { email_theme?: string | null } | null;
  }) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email');
      return { sent: false };
    }
    const { captainEmail, memberEmails, event, ...data } = params;
    const rendered = await this.templates.render(
      'team_payment_request',
      { ...data, event },
      event,
    );
    const cc = memberEmails.filter(
      (e) => e && e.toLowerCase() !== captainEmail.toLowerCase(),
    );
    const result = await this.deliver(
      await this.message(captainEmail, rendered, { cc }),
      'Team payment',
    );
    return result.ok
      ? { sent: true, id: result.id }
      : { sent: false, error: result.error };
  }

  /**
   * A free-form note from the organisers to one team, to the captain with the
   * roster on CC so a reply lands in front of everyone who has to act on it.
   */
  async sendTeamMessageEmail(params: {
    captainEmail: string;
    captainName: string;
    memberEmails: string[];
    teamLabel: string;
    eventTitle: string;
    subject: string;
    message: string;
    event?: EmailEvent | null;
    roster?: Array<{ name: string; email: string; is_captain: boolean }>;
    themeEvent?: { email_theme?: string | null } | null;
  }) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping team message');
      return { sent: false, error: 'Email service not configured' };
    }
    const rendered = await this.templates.render(
      'team_message',
      {
        captainName: params.captainName,
        teamLabel: params.teamLabel,
        eventTitle: params.eventTitle,
        customSubject: params.subject,
        message: params.message,
        event: params.event,
        roster: params.roster,
      },
      params.themeEvent ?? params.event,
    );
    const cc = params.memberEmails.filter(
      (e) => e && e.toLowerCase() !== params.captainEmail.toLowerCase(),
    );
    const result = await this.deliver(
      await this.message(params.captainEmail, rendered, { cc }),
      'Team message',
    );
    return result.ok
      ? { sent: true, id: result.id, cc_count: cc.length }
      : { sent: false, error: result.error };
  }

  /**
   * The window closed and they never confirmed, so the seat went to someone
   * else. Sent one at a time because a partial failure has to be reported per
   * person: this is the email that ends someone's participation.
   */
  async sendAcknowledgementExpiredBatch(
    recipients: Array<
      Recipient & { event: EmailEvent; deadline?: Date | string | null }
    >,
    customMessage: string,
  ) {
    if (!this.resend) {
      this.logger.warn(
        'Resend not configured, skipping acknowledgement-expired batch',
      );
      return { sent: 0, failedEmails: recipients.map((r) => r.email) };
    }
    let sent = 0;
    const failedEmails: string[] = [];
    for (const r of recipients) {
      const rendered = await this.templates.render(
        'acknowledgement_expired',
        { name: r.name, event: r.event, deadline: r.deadline, customMessage },
        r.event,
      );
      if (
        (
          await this.deliver(
            await this.message(r.email, rendered),
            'Acknowledgement-expired',
          )
        ).ok
      )
        sent++;
      else failedEmails.push(r.email);
    }
    return { sent, failedEmails };
  }
}
