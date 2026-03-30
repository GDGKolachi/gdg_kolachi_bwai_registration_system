import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as QRCode from 'qrcode';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from = 'GDG Kolachi <hello@gdgkolachi.com>';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
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

  private workshopDetailsBlock(workshop: { title: string; date: string; time: string; venue: string }): string {
    return `
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <h3 style="margin: 0 0 12px; color: #202124;">${workshop.title}</h3>
        <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${workshop.date}</p>
        <p style="margin: 4px 0;"><strong>🕐 Time:</strong> ${workshop.time}</p>
        <p style="margin: 4px 0;"><strong>📍 Venue:</strong> ${workshop.venue}</p>
      </div>
    `;
  }

  // Email 1: Sent on registration submit — includes confirm button
  async sendRegistrationConfirmation(
    email: string,
    name: string,
    workshop: { title: string; date: string; time: string; venue: string },
    registrationId: string,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email');
      return;
    }

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const confirmUrl = `${appUrl}/api/registrations/${registrationId}/confirm`;

    const html = this.emailWrapper('#4285F4', 'Confirm Your Registration', `
      <h2 style="color: #202124;">Hi ${name},</h2>
      <p>Thank you for registering for <strong>${workshop.title}</strong>!</p>
      <p>Please confirm your registration by clicking the button below:</p>
      ${this.workshopDetailsBlock(workshop)}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmUrl}" style="background: #4285F4; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
          ✅ Confirm Registration
        </a>
      </div>
      <div style="background: #FFF3CD; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>⚠️ Action required:</strong> Please confirm within 48 hours to secure your spot. Unconfirmed registrations may be released.</p>
      </div>
    `);

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: [email],
        subject: `Confirm Your Registration - ${workshop.title}`,
        html,
      });
      this.logger.log(`Registration confirmation email sent to ${email}, id: ${result.data?.id}`);
    } catch (error) {
      this.logger.error(`Failed to send registration confirmation email to ${email}`, error);
    }
  }

  // Email 2: Sent when admin shortlists — includes QR code + event details
  async sendShortlistedEmail(
    email: string,
    name: string,
    workshop: { title: string; date: string; time: string; venue: string },
    registrationId: string,
    qrData: string,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email');
      return;
    }

    const qrDataUrl = await this.generateQRCode(qrData);
    const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');

    const html = this.emailWrapper('#34A853', "You've Been Shortlisted!", `
      <h2 style="color: #202124;">Congratulations ${name}! 🎉</h2>
      <p>Great news! You have been <span style="background: #D4EDDA; color: #155724; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Shortlisted</span> for <strong>${workshop.title}</strong>!</p>
      ${this.workshopDetailsBlock(workshop)}

      <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #34A853;">
        <h3 style="margin: 0 0 8px; color: #202124;">🎫 Your Event Ticket</h3>
        <p style="color: #5F6368; margin: 0 0 16px;">Present this QR code at the venue for check-in</p>
        <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
        <p style="margin: 12px 0 0; font-size: 12px; color: #9AA0A6;">Registration ID: ${registrationId}</p>
      </div>

      <div style="background: #FFF3CD; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong></p>
        <ul style="margin: 8px 0 0; color: #856404; padding-left: 20px;">
          <li>Save or screenshot this email — you'll need the QR code for entry</li>
          <li>Arrive 15 minutes before the scheduled time</li>
          <li>Bring a valid ID matching your registration</li>
        </ul>
      </div>
    `);

    try {
      const result = await this.resend.emails.send({
        from: this.from,
        to: [email],
        subject: `🎉 You're Shortlisted! - ${workshop.title}`,
        html,
        attachments: [{
          filename: 'ticket-qrcode.png',
          content: qrBase64,
          contentType: 'image/png',
        }],
      });
      this.logger.log(`Shortlisted email sent to ${email}, id: ${result.data?.id}`);
    } catch (error) {
      this.logger.error(`Failed to send shortlisted email to ${email}`, error);
    }
  }
}
