import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import * as QRCode from 'qrcode';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from = 'GDG Kolachi <hello@gdgkolachi.com>';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not set — emails will not be sent');
      return;
    }
    this.resend = new Resend(apiKey);
    this.logger.log('Resend email service initialized');
  }

  private async generateQRCode(data: string): Promise<string> {
    return QRCode.toDataURL(data, { width: 200 });
  }

  private emailWrapper(bgColor: string, headerText: string, bodyHtml: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: ${bgColor}; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">GDG Kolachi - Build with AI</h1>
          <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">${headerText}</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          ${bodyHtml}
        </div>
        <div style="padding: 16px; background: #202124; color: #9AA0A6; text-align: center; font-size: 12px;">
          <p style="margin: 0;">GDG Kolachi - Build with AI Workshop Series</p>
          <p style="margin: 4px 0 0;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `;
  }

  private getDayName(dateStr: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateStr);
    return days[date.getUTCDay()];
  }

  private eventDetailsBlock(event: { title: string; date: string; time: string; venue: string; is_online?: boolean }): string {
    const dayName = this.getDayName(event.date);
    const isOnline = !!event.is_online;
    const venueLabel = isOnline ? '💻 Venue' : '📍 Venue';
    const venueHtml = isOnline
      ? this.formatOnlineVenue(event.venue)
      : event.venue;

    return `
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <h3 style="margin: 0 0 12px; color: #202124;">${event.title}</h3>
        <p style="margin: 4px 0;"><strong>📅 Day:</strong> ${dayName}, AM</p>
        <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${event.date}</p>
        <p style="margin: 4px 0;"><strong>🕐 Time:</strong> ${event.time}</p>
        <p style="margin: 4px 0;"><strong>${venueLabel}:</strong> ${venueHtml}</p>
      </div>
    `;
  }

  private formatOnlineVenue(venue: string): string {
    const urlMatch = venue.match(/(https?:\/\/\S+)/);
    if (urlMatch) {
      const url = urlMatch[1];
      return `Online — <a href="${url}" style="color: #1A73E8;">${url}</a>`;
    }
    return venue;
  }

  // Sent when admin shortlists — QR ticket + acknowledge spot button
  // Accepts a batch of recipients and sends all in one batch.send() call (max 100 per batch)
  async sendShortlistedEmail(
    email: string,
    name: string,
    event: { title: string; date: string; time: string; venue: string; special_instructions?: string; is_online?: boolean },
    registrationId: string,
    qrData: string,
  ) {
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '');
    const acknowledgeUrl = `${appUrl}/api/registrations/${registrationId}/acknowledge`;

    const isOnline = !!event.is_online;

    let qrBase64 = '';
    if (!isOnline) {
      const qrDataUrl = await this.generateQRCode(qrData);
      qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');
    }

    const ticketBlock = isOnline ? '' : `
      <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #34A853;">
        <h3 style="margin: 0 0 8px; color: #202124;">🎫 Your Event Ticket</h3>
        <p style="color: #5F6368; margin: 0 0 16px;">Present this QR code at the venue for check-in</p>
        <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
        <p style="margin: 12px 0 0; font-size: 12px; color: #9AA0A6;">Registration ID: ${registrationId}</p>
      </div>
    `;

    const importantBlock = isOnline ? `
      <div style="background: #E8F5E9; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #2E7D32;"><strong>💻 This is an online event</strong></p>
        <ul style="margin: 8px 0 0; color: #2E7D32; padding-left: 20px;">
          <li>Join using the link in the event details above</li>
          <li>Be ready a few minutes before the scheduled time</li>
        </ul>
      </div>
    ` : `
      <div style="background: #FFF3CD; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong></p>
        <ul style="margin: 8px 0 0; color: #856404; padding-left: 20px;">
          <li>Save or screenshot this email — you'll need the QR code for entry</li>
          <li>Arrive 15 minutes before the scheduled time</li>
          <li>Bring a valid ID matching your registration</li>
        </ul>
      </div>
    `;

    const html = this.emailWrapper('#34A853', "You've Been Shortlisted!", `
      <h2 style="color: #202124;">Congratulations ${name}! 🎉</h2>
      <p>You have been <span style="background: #D4EDDA; color: #155724; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Shortlisted</span> for <strong>${event.title}</strong>!</p>
      ${this.eventDetailsBlock(event)}
      ${ticketBlock}
      <div style="text-align: center; margin: 24px 0;">
        <p style="color: #5F6368; margin: 0 0 12px; font-size: 14px;">Please confirm that you will attend:</p>
        <a href="${acknowledgeUrl}" style="background: #34A853; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
          ✓ Confirm my spot
        </a>
      </div>
      ${event.special_instructions ? `
      <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <p style="margin: 0; color: #1A73E8;"><strong>📋 Special Instructions:</strong></p>
        <div style="margin: 8px 0 0; color: #202124; white-space: pre-line;">${event.special_instructions}</div>
      </div>
      ` : ''}
      ${importantBlock}
    `);

    if (!this.resend) { this.logger.warn('Resend not configured, skipping email'); return; }

    const attachments = isOnline ? [] : [
      {
        filename: 'ticket-qrcode.png',
        content: Buffer.from(qrBase64, 'base64'),
        contentType: 'image/png',
        contentId: 'qrcode',
      },
    ];

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [email],
      subject: `🎉 You're Shortlisted! - GDG Kolachi's ${event.title}`,
      html,
      attachments,
    });

    if (error) {
      this.logger.error(`Failed to send shortlisted email to ${email}`, error);
      return;
    }
    this.logger.log(`Shortlisted email sent to ${email}, id: ${data.id}`);
  }

  // Reminder email — re-sends entry pass (QR) + event instructions + an admin-written note
  // to recipients who are already shortlisted/confirmed. Uses Resend's batch API in chunks of 100.
  async sendReminderBatch(
    recipients: Array<{
      email: string;
      name: string;
      event: { title: string; date: string; time: string; venue: string; special_instructions?: string; is_online?: boolean };
      registrationId: string;
      qrData: string;
    }>,
    customMessage: string,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping reminder batch');
      return { sent: 0 };
    }

    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '');
    const safeMessage = (customMessage || '').trim();
    const batchSize = 100;
    let sentCount = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize);

      const messages = await Promise.all(
        chunk.map(async (r) => {
          const isOnline = !!r.event.is_online;
          const acknowledgeUrl = `${appUrl}/api/registrations/${r.registrationId}/acknowledge`;

          let qrBase64 = '';
          if (!isOnline && r.qrData) {
            const qrDataUrl = await this.generateQRCode(r.qrData);
            qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');
          }

          const ticketBlock = isOnline || !r.qrData ? '' : `
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #F4B400;">
              <h3 style="margin: 0 0 8px; color: #202124;">🎫 Your Entry Pass</h3>
              <p style="color: #5F6368; margin: 0 0 12px; font-size: 13px;">Present this QR code at the venue for check-in</p>
              <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px;" />
              <p style="margin: 10px 0 0; font-size: 12px; color: #9AA0A6;">Registration ID: ${r.registrationId}</p>
            </div>
          `;

          const acknowledgeBlock = `
            <div style="text-align: center; margin: 24px 0;">
              <p style="color: #5F6368; margin: 0 0 12px; font-size: 14px;">Haven't confirmed yet? Confirm your spot now:</p>
              <a href="${acknowledgeUrl}" style="background: #34A853; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                ✓ Confirm my spot
              </a>
            </div>
          `;

          const customBlock = safeMessage ? `
            <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F4B400;">
              <p style="margin: 0 0 6px; color: #B06000; font-weight: bold;">📌 A note from the organizers</p>
              <div style="margin: 0; color: #202124; white-space: pre-line;">${this.escapeHtml(safeMessage)}</div>
            </div>
          ` : '';

          const instructionsBlock = r.event.special_instructions ? `
            <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
              <p style="margin: 0; color: #1A73E8;"><strong>📋 Event Instructions:</strong></p>
              <div style="margin: 8px 0 0; color: #202124; white-space: pre-line;">${r.event.special_instructions}</div>
            </div>
          ` : '';

          const html = this.emailWrapper('#F4B400', 'Reminder: Your spot is confirmed', `
            <h2 style="color: #202124; margin: 0 0 10px;">Hi ${r.name} 👋</h2>
            <p style="margin: 0;">This is a friendly reminder that you're shortlisted for <strong>${r.event.title}</strong>. We're sharing your entry pass and important info one more time so it's easy to find.</p>
            ${this.eventDetailsBlock(r.event)}
            ${customBlock}
            ${instructionsBlock}
            ${ticketBlock}
            ${acknowledgeBlock}
            <p style="color: #5F6368; font-size: 13px; margin: 20px 0 0;">See you there! 🎉</p>
          `);

          const attachments = isOnline || !r.qrData ? [] : [
            {
              filename: 'entry-pass.png',
              content: Buffer.from(qrBase64, 'base64'),
              contentType: 'image/png',
              contentId: 'qrcode',
            },
          ];

          return {
            from: this.from,
            to: [r.email],
            subject: `🔔 Reminder: ${r.event.title} — your entry pass`,
            html,
            attachments,
          };
        }),
      );

      for (const msg of messages) {
        try {
          const { data, error } = await this.resend.emails.send(msg);
          if (error) {
            this.logger.error(`Reminder email failed for ${msg.to[0]}`, error);
          } else {
            sentCount++;
            this.logger.log(`Reminder email sent to ${msg.to[0]}, id: ${data.id}`);
          }
        } catch (err) {
          this.logger.error(`Reminder email exception for ${msg.to[0]}`, err);
        }
      }
    }

    return { sent: sentCount };
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async sendRejectionEmail(
    email: string,
    name: string,
    event: { title: string },
  ) {
    const html = this.emailWrapper('#EA4335', 'Application Update', `
      <h2 style="color: #202124;">Hi ${name},</h2>
      <p>Thank you for your interest in <strong>${event.title}</strong>.</p>
      <p>After careful review, we regret to inform you that your application was <span style="background: #FECDD3; color: #9B1C1C; padding: 2px 8px; border-radius: 4px; font-weight: bold;">not selected</span> this time.</p>
      <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EA4335;">
        <p style="margin: 0; color: #5F6368;">We received a large number of applications and had limited spots available. This does not reflect on your abilities — we encourage you to apply for future GDG Kolachi events!</p>
      </div>
      <p style="color: #5F6368;">Stay connected with us for upcoming opportunities. We'd love to see you at a future event! 🚀</p>
    `);

    if (!this.resend) { this.logger.warn('Resend not configured, skipping rejection email'); return; }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [email],
      subject: `Application Update — ${event.title}`,
      html,
    });

    if (error) {
      this.logger.error(`Failed to send rejection email to ${email}`, error);
      return;
    }
    this.logger.log(`Rejection email sent to ${email}, id: ${data.id}`);
  }

  /**
   * `customMessage` is the organisers' own words for this particular round —
   * what the cohort was chosen for, when the next one opens. It sits after the
   * standard paragraph rather than replacing it, so the reason a rejection
   * exists is always stated even when nobody writes anything.
   */
  async sendRejectionBatch(
    recipients: Array<{ email: string; name: string; event: { title: string } }>,
    customMessage = '',
  ) {
    if (!this.resend) { this.logger.warn('Resend not configured, skipping rejection batch'); return { sent: 0 }; }

    const safeMessage = (customMessage || '').trim();
    const customBlock = safeMessage ? `
      <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5F6368;">
        <p style="margin: 0 0 6px; color: #5F6368; font-weight: bold;">📌 A note from the organizers</p>
        <div style="margin: 0; color: #202124; white-space: pre-line;">${this.escapeHtml(safeMessage)}</div>
      </div>
    ` : '';

    const batchSize = 100;
    let sentCount = 0;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize);

      const messages = chunk.map((r) => {
        const html = this.emailWrapper('#EA4335', 'Application Update', `
          <h2 style="color: #202124;">Hi ${r.name},</h2>
          <p>Thank you for your interest in <strong>${r.event.title}</strong>.</p>
          <p>After careful review, we regret to inform you that your application was <span style="background: #FECDD3; color: #9B1C1C; padding: 2px 8px; border-radius: 4px; font-weight: bold;">not selected</span> this time.</p>
          <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EA4335;">
            <p style="margin: 0; color: #5F6368;">We received a large number of applications and had limited spots available. This does not reflect on your abilities — we encourage you to apply for future GDG Kolachi events!</p>
          </div>
          ${customBlock}
          <p style="color: #5F6368;">Stay connected with us for upcoming opportunities. We'd love to see you at a future event! 🚀</p>
        `);

        return {
          from: this.from,
          to: [r.email],
          subject: `Application Update — ${r.event.title}`,
          html,
        };
      });

      const { data, error } = await this.resend.batch.send(messages);
      if (error) {
        this.logger.error(`Rejection batch send failed for chunk ${i}–${i + chunk.length}`, error);
      } else {
        sentCount += chunk.length;
        this.logger.log(`Rejection batch sent ${chunk.length} emails, ids: ${data.data.map(d => d.id).join(', ')}`);
      }
    }

    return { sent: sentCount };
  }

  // Batch send — used when bulk shortlisting up to 100 registrations at once
  async sendShortlistedBatch(
    recipients: Array<{
      email: string;
      name: string;
      event: { title: string; date: string; time: string; venue: string; special_instructions?: string; is_online?: boolean };
      registrationId: string;
      qrData: string;
    }>,
  ) {
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize);

      const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/api\/?$/, '').replace(/\/$/, '');
      const messages = await Promise.all(
        chunk.map(async (r) => {
          const acknowledgeUrl = `${appUrl}/api/registrations/${r.registrationId}/acknowledge`;
          const isOnline = !!r.event.is_online;

          let qrBase64 = '';
          if (!isOnline) {
            const qrDataUrl = await this.generateQRCode(r.qrData);
            qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');
          }

          const ticketBlock = isOnline ? '' : `
            <div style="text-align: center; margin: 20px 0; border: 2px dashed #34A853; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 8px;">🎫 Your Event Ticket</h3>
              <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
              <p style="font-size: 12px; color: #9AA0A6;">Registration ID: ${r.registrationId}</p>
            </div>
          `;

          const importantBlock = isOnline ? `
            <div style="background: #E8F5E9; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #2E7D32;"><strong>💻 This is an online event</strong></p>
              <ul style="margin: 8px 0 0; color: #2E7D32; padding-left: 20px;">
                <li>Join using the link in the event details above</li>
                <li>Be ready a few minutes before the scheduled time</li>
              </ul>
            </div>
          ` : '';

          const html = this.emailWrapper('#34A853', "You've Been Shortlisted!", `
            <h2 style="color: #202124;">Congratulations ${r.name}! 🎉</h2>
            <p>You have been <span style="background: #D4EDDA; color: #155724; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Shortlisted</span> for <strong>${r.event.title}</strong>!</p>
            ${this.eventDetailsBlock(r.event)}
            ${ticketBlock}
            <div style="text-align: center; margin: 20px 0;">
              <p style="color: #5F6368; margin: 0 0 10px;">Please confirm that you will attend:</p>
              <a href="${acknowledgeUrl}" style="background: #34A853; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">✓ Confirm my spot</a>
            </div>
            ${r.event.special_instructions ? `
            <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
              <p style="margin: 0; color: #1A73E8;"><strong>📋 Special Instructions:</strong></p>
              <div style="margin: 8px 0 0; color: #202124; white-space: pre-line;">${r.event.special_instructions}</div>
            </div>
            ` : ''}
            ${importantBlock}
          `);

          const attachments = isOnline ? [] : [
            {
              filename: 'ticket-qrcode.png',
              content: Buffer.from(qrBase64, 'base64'),
              contentType: 'image/png',
              contentId: 'qrcode',
            },
          ];

          return {
            from: this.from,
            to: [r.email],
            subject: `🎉 You're Shortlisted! - GDG Kolachi's ${r.event.title}`,
            html,
            attachments,
          };
        }),
      );

      if (!this.resend) { this.logger.warn('Resend not configured, skipping batch'); return; }
      for (const msg of messages) {
        try {
          const { data, error } = await this.resend.emails.send(msg);
          if (error) {
            this.logger.error(`Shortlisted email failed for ${msg.to[0]}`, error);
          } else {
            this.logger.log(`Shortlisted email sent to ${msg.to[0]}, id: ${data.id}`);
          }
        } catch (err) {
          this.logger.error(`Shortlisted email exception for ${msg.to[0]}`, err);
        }
      }
    }
  }

  /**
   * Deposit request for a selected team. Addressed to the captain, who is the
   * one who pays, with the rest of the roster on CC so nobody's seat quietly
   * depends on a teammate they cannot see.
   *
   * The deposit is one flat amount for the whole team — the copy says so
   * explicitly, because four members each sending it is the obvious way for
   * this to go wrong.
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
    deposit: {
      display: string; payeeName: string; bankName: string;
      accountNumber: string; iban: string; swift: string; windowHours: number;
    };
  }) {
    const {
      captainEmail, captainName, memberEmails, teamLabel, memberCount,
      eventTitle, deadline, submitUrl, deposit,
    } = params;

    const deadlineText = deadline.toUTCString().replace('GMT', 'UTC');

    const html = this.emailWrapper('#F9AB00', 'Confirm Your Team\u2019s Spot', `
      <h2 style="color: #202124;">Hi ${this.escapeHtml(captainName)},</h2>
      <p>Your team <strong>${this.escapeHtml(teamLabel)}</strong> has a place at
      <strong>${this.escapeHtml(eventTitle)}</strong>. To lock it in, a refundable
      deposit is required within <strong>${deposit.windowHours} hours</strong>.</p>

      <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; border: 2px dashed #F9AB00;">
        <p style="margin: 0 0 4px; color: #5F6368; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Amount</p>
        <p style="margin: 0 0 16px; font-size: 32px; font-weight: bold; color: #202124;">${deposit.display}</p>
        <p style="margin: 0 0 4px; color: #5F6368; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Send to</p>
        <p style="margin: 0 0 12px; font-size: 18px; font-weight: bold; color: #202124;">${this.escapeHtml(deposit.payeeName)}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #5F6368; white-space: nowrap;">Bank</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #202124;">${this.escapeHtml(deposit.bankName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #5F6368; white-space: nowrap;">IBAN</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 15px; font-weight: bold; color: #202124; word-break: break-all;">${this.escapeHtml(deposit.iban)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #5F6368; white-space: nowrap;">Account number</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 15px; color: #202124;">${this.escapeHtml(deposit.accountNumber)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #5F6368; white-space: nowrap;">SWIFT</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 15px; color: #202124;">${this.escapeHtml(deposit.swift)}</td>
          </tr>
        </table>
        <p style="margin: 10px 0 0; font-size: 12px; color: #9AA0A6;">
          A local transfer needs only the IBAN. SWIFT is for international wires.
        </p>
      </div>

      <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <p style="margin: 0; color: #1A73E8;"><strong>One payment for the whole team</strong></p>
        <p style="margin: 8px 0 0; color: #202124;">
          ${deposit.display} covers all ${memberCount} member${memberCount === 1 ? '' : 's'}.
          Please do <strong>not</strong> send it once per person \u2014 the captain pays once on
          behalf of the team.
        </p>
      </div>

      <div style="background: #FFF3CD; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>\u23F0 Deadline: ${deadlineText}</strong></p>
        <p style="margin: 8px 0 0; color: #856404;">
          That is ${deposit.windowHours} hours from now. After it passes your team is flagged
          for review \u2014 if you have paid and are simply late telling us, submit the details
          anyway and we will sort it out.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <p style="color: #5F6368; margin: 0 0 12px; font-size: 14px;">Once you have sent it, tell us here:</p>
        <a href="${submitUrl}" style="background: #F9AB00; color: #202124; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
          I have paid \u2014 submit details
        </a>
        <p style="margin: 12px 0 0; font-size: 12px; color: #9AA0A6;">
          You will need the transaction ID from your transfer receipt.
        </p>
      </div>

      <div style="background: #E6F4EA; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #34A853;">
        <p style="margin: 0; color: #1E8E3E;"><strong>What happens next</strong></p>
        <ol style="margin: 8px 0 0; color: #202124; padding-left: 20px;">
          <li>Send ${deposit.display} to the number above.</li>
          <li>Submit the transaction ID using the button below.</li>
          <li>We verify it against our records \u2014 and once verified, your team is
              <strong>shortlisted</strong> and everyone receives their entry pass by email.</li>
        </ol>
      </div>

      <p style="color: #5F6368; font-size: 13px;">
        Your team is shortlisted only once we have verified the deposit. If the link above does
        not work, copy this into your browser:<br />
        <span style="word-break: break-all; color: #1A73E8;">${submitUrl}</span>
      </p>
    `);

    if (!this.resend) { this.logger.warn('Resend not configured, skipping email'); return { sent: false }; }

    // Members go on CC so the whole roster sees the same thread, while the
    // captain stays the addressee who is expected to act.
    const cc = memberEmails.filter(e => e && e.toLowerCase() !== captainEmail.toLowerCase());

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [captainEmail],
      cc: cc.length > 0 ? cc : undefined,
      subject: `Action needed: confirm ${teamLabel} with a ${deposit.display} deposit`,
      html,
    });

    if (error) {
      this.logger.error(`Failed to send team payment email to ${captainEmail}`, error);
      return { sent: false, error: String(error) };
    }
    this.logger.log(`Team payment email sent to ${captainEmail} (cc ${cc.length}), id: ${data.id}`);
    return { sent: true, id: data.id };
  }

  /**
   * A free-form note from the organisers to one team. Addressed to the captain
   * with the rest of the roster on CC, so a reply lands in front of everyone who
   * has to act on it rather than in the captain's inbox alone — the same
   * addressing the deposit request uses, for the same reason.
   *
   * The admin writes the subject and the body; everything else is context they
   * would otherwise retype for every team — when and where the event is, and
   * who this actually went to.
   */
  async sendTeamMessageEmail(params: {
    captainEmail: string;
    captainName: string;
    memberEmails: string[];
    teamLabel: string;
    eventTitle: string;
    subject: string;
    message: string;
    event?: { title: string; date: string; time: string; venue: string; special_instructions?: string; is_online?: boolean } | null;
    roster?: Array<{ name: string; email: string; is_captain: boolean }>;
  }) {
    const {
      captainEmail, captainName, memberEmails, teamLabel,
      eventTitle, subject, message, event, roster,
    } = params;

    const messageBlock = `
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <div style="margin: 0; color: #202124; white-space: pre-line; line-height: 1.6;">${this.escapeHtml(message)}</div>
      </div>
    `;

    const rosterBlock = roster && roster.length > 0 ? `
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 12px; color: #5F6368; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Your team</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${roster.map(m => `
            <tr>
              <td style="padding: 6px 0; color: #202124; font-weight: bold;">
                ${this.escapeHtml(m.name)}${m.is_captain ? ' <span style="color: #1A73E8; font-weight: normal; font-size: 12px;">(captain)</span>' : ''}
              </td>
              <td style="padding: 6px 0; text-align: right; color: #5F6368; word-break: break-all;">${this.escapeHtml(m.email)}</td>
            </tr>
          `).join('')}
        </table>
        <p style="margin: 12px 0 0; font-size: 12px; color: #9AA0A6;">
          Everyone listed above received this email — the captain directly, the rest on CC.
        </p>
      </div>
    ` : '';

    const instructionsBlock = event?.special_instructions ? `
      <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <p style="margin: 0; color: #1A73E8;"><strong>📋 Event Instructions:</strong></p>
        <div style="margin: 8px 0 0; color: #202124; white-space: pre-line;">${event.special_instructions}</div>
      </div>
    ` : '';

    const html = this.emailWrapper('#4285F4', `A message about ${teamLabel}`, `
      <h2 style="color: #202124; margin: 0 0 10px;">Hi ${this.escapeHtml(captainName)} and team 👋</h2>
      <p style="margin: 0;">This is about your team <strong>${this.escapeHtml(teamLabel)}</strong> at
      <strong>${this.escapeHtml(eventTitle)}</strong>.</p>
      ${messageBlock}
      ${event ? this.eventDetailsBlock(event) : ''}
      ${instructionsBlock}
      ${rosterBlock}
      <p style="color: #5F6368; font-size: 13px; margin: 20px 0 0;">See you there! 🎉</p>
    `);

    if (!this.resend) { this.logger.warn('Resend not configured, skipping team message'); return { sent: false, error: 'Email service not configured' }; }

    const cc = memberEmails.filter(e => e && e.toLowerCase() !== captainEmail.toLowerCase());

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [captainEmail],
      cc: cc.length > 0 ? cc : undefined,
      subject,
      html,
    });

    if (error) {
      this.logger.error(`Failed to send team message to ${captainEmail}`, error);
      return { sent: false, error: String(error) };
    }
    this.logger.log(`Team message sent to ${captainEmail} (cc ${cc.length}), id: ${data.id}`);
    return { sent: true, id: data.id, cc_count: cc.length };
  }

  /**
   * The window closed and they never confirmed, so the seat went to someone
   * else. Sent one message at a time rather than through batch.send() because a
   * partial failure has to be reported per person — this is the email that ends
   * someone's participation, and "we think it sent" is not good enough.
   *
   * The copy is deliberately final about the seat and warm about the next event:
   * the intent is to close the loop, not to scold anyone for missing a deadline.
   */
  async sendAcknowledgementExpiredBatch(
    recipients: Array<{
      email: string;
      name: string;
      event: { title: string; date: string; time: string; venue: string; is_online?: boolean };
      deadline?: Date | string | null;
    }>,
    customMessage: string,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping acknowledgement-expired batch');
      return { sent: 0, failedEmails: recipients.map(r => r.email) };
    }

    const safeMessage = (customMessage || '').trim();
    let sentCount = 0;
    const failedEmails: string[] = [];

    for (const r of recipients) {
      const deadlineText = r.deadline
        ? (r.deadline instanceof Date ? r.deadline : new Date(r.deadline)).toUTCString().replace('GMT', 'UTC')
        : null;

      const customBlock = safeMessage ? `
        <div style="background: white; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5F6368;">
          <p style="margin: 0 0 6px; color: #5F6368; font-weight: bold;">📌 A note from the organizers</p>
          <div style="margin: 0; color: #202124; white-space: pre-line;">${this.escapeHtml(safeMessage)}</div>
        </div>
      ` : '';

      const html = this.emailWrapper('#5F6368', 'Confirmation window closed', `
        <h2 style="color: #202124; margin: 0 0 10px;">Hi ${this.escapeHtml(r.name)},</h2>
        <p style="margin: 0;">You were shortlisted for <strong>${this.escapeHtml(r.event.title)}</strong>, and we asked you to
        confirm your spot${deadlineText ? ` by <strong>${deadlineText}</strong>` : ''}.</p>

        <div style="background: #FDECEA; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EA4335;">
          <p style="margin: 0; color: #9B1C1C;"><strong>That deadline has now passed and we did not hear from you.</strong></p>
          <p style="margin: 8px 0 0; color: #202124;">
            Your spot has been released to someone on the waiting list, so you will
            <strong>not be able to attend</strong>. Any entry pass sent to you earlier is no longer valid.
          </p>
        </div>
        ${customBlock}
        <p style="color: #5F6368;">Seats are limited and we hold them only for people we can confirm, which is why the
        window is firm. If you believe this is a mistake, reply to the team that shortlisted you as soon as possible.</p>
        <p style="color: #5F6368;">We would genuinely like to see you at a future GDG Kolachi event — you stay on our
        list and will hear about the next one. 🚀</p>
      `);

      try {
        const { data, error } = await this.resend.emails.send({
          from: this.from,
          to: [r.email],
          subject: `Your spot for ${r.event.title} has been released`,
          html,
        });
        if (error) {
          this.logger.error(`Acknowledgement-expired email failed for ${r.email}`, error);
          failedEmails.push(r.email);
        } else {
          sentCount++;
          this.logger.log(`Acknowledgement-expired email sent to ${r.email}, id: ${data.id}`);
        }
      } catch (err) {
        this.logger.error(`Acknowledgement-expired email exception for ${r.email}`, err);
        failedEmails.push(r.email);
      }
    }

    return { sent: sentCount, failedEmails };
  }
}
