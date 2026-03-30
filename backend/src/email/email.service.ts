import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import * as QRCode from 'qrcode';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from = 'GDG Kolachi <hello@gdgkolachi.com>';

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn('RESEND_API_KEY is not set — emails will be skipped');
      return;
    }
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.logger.log('Resend email service initialized');
  }

  // Single email — sent when admin shortlists a registration.
  // Contains event details, QR ticket, and a Confirm button.
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

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const confirmUrl = `${appUrl}/api/registrations/${registrationId}/confirm`;

    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 200 });
    const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: #34A853; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">GDG Kolachi - Build with AI</h1>
          <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">You've Been Shortlisted!</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #202124;">Congratulations ${name}! 🎉</h2>
          <p>You have been <span style="background: #D4EDDA; color: #155724; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Shortlisted</span> for <strong>${workshop.title}</strong>!</p>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
            <h3 style="margin: 0 0 12px; color: #202124;">${workshop.title}</h3>
            <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${workshop.date}</p>
            <p style="margin: 4px 0;"><strong>🕐 Time:</strong> ${workshop.time}</p>
            <p style="margin: 4px 0;"><strong>📍 Venue:</strong> ${workshop.venue}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background: #4285F4; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
              ✅ Confirm My Spot
            </a>
            <p style="color: #5F6368; font-size: 13px; margin-top: 10px;">Click to confirm your attendance and secure your spot.</p>
          </div>

          <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #34A853;">
            <h3 style="margin: 0 0 8px; color: #202124;">🎫 Your Entry QR Code</h3>
            <p style="color: #5F6368; margin: 0 0 16px;">Present this at the venue for check-in</p>
            <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
            <p style="margin: 12px 0 0; font-size: 12px; color: #9AA0A6;">Registration ID: ${registrationId}</p>
          </div>

          <div style="background: #FFF3CD; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong></p>
            <ul style="margin: 8px 0 0; color: #856404; padding-left: 20px;">
              <li>Please confirm your spot using the button above</li>
              <li>Save or screenshot this email — you'll need the QR code for entry</li>
              <li>Arrive 15 minutes before the scheduled time</li>
              <li>Bring a valid ID matching your registration</li>
            </ul>
          </div>
        </div>
        <div style="padding: 16px; background: #202124; color: #9AA0A6; text-align: center; font-size: 12px;">
          <p style="margin: 0;">GDG Kolachi - Build with AI Workshop Series</p>
          <p style="margin: 4px 0 0;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `;

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [email],
      subject: `🎉 You're Shortlisted! Confirm Your Spot - ${workshop.title}`,
      html,
      attachments: [{ filename: 'ticket-qrcode.png', content: qrBase64, contentType: 'image/png' }],
    });

    if (error) {
      this.logger.error(`Failed to send shortlisted email to ${email}`, error);
      return;
    }
    this.logger.log(`Shortlisted email sent to ${email}, id: ${data.id}`);
  }
}
