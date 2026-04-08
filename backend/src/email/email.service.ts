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

  private workshopDetailsBlock(workshop: { title: string; date: string; time: string; venue: string }): string {
    const dayName = this.getDayName(workshop.date);
    return `
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <h3 style="margin: 0 0 12px; color: #202124;">${workshop.title}</h3>
        <p style="margin: 4px 0;"><strong>📅 Day:</strong> ${dayName}, AM</p>
        <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${workshop.date}</p>
        <p style="margin: 4px 0;"><strong>🕐 Time:</strong> ${workshop.time}</p>
        <p style="margin: 4px 0;"><strong>📍 Venue:</strong> ${workshop.venue}</p>
      </div>
    `;
  }

  // Sent when admin shortlists — QR ticket + acknowledge spot button
  // Accepts a batch of recipients and sends all in one batch.send() call (max 100 per batch)
  async sendShortlistedEmail(
    email: string,
    name: string,
    workshop: { title: string; date: string; time: string; venue: string; special_instructions?: string },
    registrationId: string,
    qrData: string,
  ) {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const acknowledgeUrl = `${appUrl}/api/registrations/${registrationId}/acknowledge`;

    const qrDataUrl = await this.generateQRCode(qrData);
    const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');

    const html = this.emailWrapper('#34A853', "You've Been Shortlisted!", `
      <h2 style="color: #202124;">Congratulations ${name}! 🎉</h2>
      <p>You have been <span style="background: #D4EDDA; color: #155724; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Shortlisted</span> for <strong>${workshop.title}</strong>!</p>
      ${this.workshopDetailsBlock(workshop)}
      <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #34A853;">
        <h3 style="margin: 0 0 8px; color: #202124;">🎫 Your Event Ticket</h3>
        <p style="color: #5F6368; margin: 0 0 16px;">Present this QR code at the venue for check-in</p>
        <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
        <p style="margin: 12px 0 0; font-size: 12px; color: #9AA0A6;">Registration ID: ${registrationId}</p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <p style="color: #5F6368; margin: 0 0 12px; font-size: 14px;">Please confirm that you will attend:</p>
        <a href="${acknowledgeUrl}" style="background: #34A853; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
          ✓ Confirm my spot
        </a>
      </div>
      ${workshop.special_instructions ? `
      <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <p style="margin: 0; color: #1A73E8;"><strong>📋 Special Instructions:</strong></p>
        <div style="margin: 8px 0 0; color: #202124; white-space: pre-line;">${workshop.special_instructions}</div>
      </div>
      ` : ''}
      <div style="background: #FFF3CD; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong></p>
        <ul style="margin: 8px 0 0; color: #856404; padding-left: 20px;">
          <li>Save or screenshot this email — you'll need the QR code for entry</li>
          <li>Arrive 15 minutes before the scheduled time</li>
          <li>Bring a valid ID matching your registration</li>
        </ul>
      </div>
    `);

    if (!this.resend) { this.logger.warn('Resend not configured, skipping email'); return; }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [email],
      subject: `GDG Kolachi ${workshop.title}`,
      html,
      attachments: [
        {
          filename: 'ticket-qrcode.png',
          content: qrBase64,
          contentType: 'image/png',
          contentId: 'qrcode',
        },
      ],
    });

    if (error) {
      this.logger.error(`Failed to send shortlisted email to ${email}`, error);
      return;
    }
    this.logger.log(`Shortlisted email sent to ${email}, id: ${data.id}`);
  }

  // Batch send — used when bulk shortlisting up to 100 registrations at once
  async sendShortlistedBatch(
    recipients: Array<{
      email: string;
      name: string;
      workshop: { title: string; date: string; time: string; venue: string; special_instructions?: string };
      registrationId: string;
      qrData: string;
    }>,
  ) {
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const chunk = recipients.slice(i, i + batchSize);

      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const messages = await Promise.all(
        chunk.map(async (r) => {
          const acknowledgeUrl = `${appUrl}/api/registrations/${r.registrationId}/acknowledge`;
          const qrDataUrl = await this.generateQRCode(r.qrData);
          const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');
          const html = this.emailWrapper('#34A853', "You've Been Shortlisted!", `
            <h2 style="color: #202124;">Congratulations ${r.name}! 🎉</h2>
            <p>You have been <span style="background: #D4EDDA; color: #155724; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Shortlisted</span> for <strong>${r.workshop.title}</strong>!</p>
            ${this.workshopDetailsBlock(r.workshop)}
            <div style="text-align: center; margin: 20px 0; border: 2px dashed #34A853; padding: 20px; border-radius: 8px;">
              <h3 style="margin: 0 0 8px;">🎫 Your Event Ticket</h3>
              <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
              <p style="font-size: 12px; color: #9AA0A6;">Registration ID: ${r.registrationId}</p>
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <p style="color: #5F6368; margin: 0 0 10px;">Please confirm that you will attend:</p>
              <a href="${acknowledgeUrl}" style="background: #34A853; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">✓ Confirm my spot</a>
            </div>
            ${r.workshop.special_instructions ? `
            <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
              <p style="margin: 0; color: #1A73E8;"><strong>📋 Special Instructions:</strong></p>
              <div style="margin: 8px 0 0; color: #202124; white-space: pre-line;">${r.workshop.special_instructions}</div>
            </div>
            ` : ''}
          `);
          return {
            from: this.from,
            to: [r.email],
            subject: `GDG Kolachi ${r.workshop.title}`,
            html,
            attachments: [
              {
                filename: 'ticket-qrcode.png',
                content: qrBase64,
                contentType: 'image/png',
                contentId: 'qrcode',
              },
            ],
          };
        }),
      );

      if (!this.resend) { this.logger.warn('Resend not configured, skipping batch'); return; }
      const { data, error } = await this.resend.batch.send(messages);
      if (error) {
        this.logger.error(`Batch send failed for chunk ${i}–${i + chunk.length}`, error);
      } else {
        this.logger.log(`Batch sent ${chunk.length} shortlist emails, ids: ${data.data.map(d => d.id).join(', ')}`);
      }
    }
  }
}
