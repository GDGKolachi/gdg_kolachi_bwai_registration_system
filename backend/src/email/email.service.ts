import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import * as QRCode from 'qrcode';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly from = 'GDG Kolachi <noreply@gdgkolachi.com>';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
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

  // Registration pending - sent when person first registers
  async sendRegistrationPending(email: string, name: string, workshop: { title: string; date: string; time: string; venue: string }) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email');
      return;
    }

    const html = this.emailWrapper('#4285F4', 'Registration Received', `
      <h2 style="color: #202124;">Hi ${name},</h2>
      <p>Thank you for registering for <strong>${workshop.title}</strong>!</p>
      <p>Your registration is currently <span style="background: #FFF3CD; color: #856404; padding: 2px 8px; border-radius: 4px; font-weight: bold;">Pending</span> review by our team.</p>
      ${this.workshopDetailsBlock(workshop)}
      <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #1967D2;"><strong>What's next?</strong></p>
        <p style="margin: 8px 0 0; color: #5F6368;">Our team will review your registration. Once shortlisted, you'll receive a confirmation email with your event ticket and QR code.</p>
      </div>
    `);

    try {
      await this.resend.emails.send({ from: this.from, to: email, subject: `Registration Received - ${workshop.title}`, html });
    } catch (error) {
      this.logger.error('Failed to send registration pending email', error);
    }
  }

  // Shortlisted - includes QR code ticket
  async sendShortlistedEmail(
    email: string, name: string,
    workshop: { title: string; date: string; time: string; venue: string },
    registrationId: string, qrData: string,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email');
      return;
    }

    const qrDataUrl = await this.generateQRCode(qrData);
    const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');

    const html = this.emailWrapper('#34A853', 'You\'ve Been Shortlisted!', `
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
          <li>Save or screenshot this email - you'll need the QR code for entry</li>
          <li>Arrive 15 minutes before the scheduled time</li>
          <li>Bring a valid ID matching your registration</li>
        </ul>
      </div>
    `);

    try {
      await this.resend.emails.send({
        from: this.from, to: email,
        subject: `🎉 You're Shortlisted! - ${workshop.title}`,
        html,
        attachments: [{
          filename: 'ticket-qrcode.png',
          content: qrBase64,
          contentId: 'qrcode',
        }],
      });
    } catch (error) {
      this.logger.error('Failed to send shortlisted email', error);
    }
  }

  // Attended confirmation - sent after QR scan marks them attended
  async sendAttendedConfirmation(
    email: string, name: string,
    workshop: { title: string; date: string; time: string; venue: string },
  ) {
    if (!this.resend) return;

    const html = this.emailWrapper('#4285F4', 'Attendance Confirmed', `
      <h2 style="color: #202124;">Welcome ${name}! 🎊</h2>
      <p>Your attendance at <strong>${workshop.title}</strong> has been confirmed!</p>
      ${this.workshopDetailsBlock(workshop)}
      <div style="background: #D4EDDA; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #155724; font-size: 18px;"><strong>✅ You're checked in!</strong></p>
        <p style="margin: 8px 0 0; color: #155724;">Enjoy the workshop and happy learning!</p>
      </div>
    `);

    try {
      await this.resend.emails.send({ from: this.from, to: email, subject: `Attendance Confirmed - ${workshop.title}`, html });
    } catch (error) {
      this.logger.error('Failed to send attended confirmation email', error);
    }
  }

  // Rejection email
  async sendRejectionEmail(email: string, name: string, workshopTitle: string) {
    if (!this.resend) return;

    const html = this.emailWrapper('#EA4335', 'Registration Update', `
      <h2 style="color: #202124;">Hi ${name},</h2>
      <p>Thank you for your interest in <strong>${workshopTitle}</strong>.</p>
      <p>Unfortunately, we were unable to accommodate your registration at this time due to high demand and limited capacity.</p>
      <div style="background: #FFF3CD; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #856404;"><strong>Don't worry!</strong></p>
        <p style="margin: 8px 0 0; color: #856404;">Keep an eye out for future GDG Kolachi events. We'd love to see you at our upcoming workshops!</p>
      </div>
      <p>If you have any questions, please reach out to the GDG Kolachi team.</p>
    `);

    try {
      await this.resend.emails.send({ from: this.from, to: email, subject: `Registration Update - ${workshopTitle}`, html });
    } catch (error) {
      this.logger.error('Failed to send rejection email', error);
    }
  }

  // Batch email sending (sends in batches of 100)
  async sendBatchEmails(
    emails: Array<{ to: string; subject: string; html: string; attachments?: any[] }>,
  ) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping batch emails');
      return;
    }

    const batchSize = 100;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const promises = batch.map((email) =>
        this.resend.emails.send({
          from: this.from,
          to: email.to,
          subject: email.subject,
          html: email.html,
          attachments: email.attachments,
        }).catch((error) => {
          this.logger.error(`Failed to send email to ${email.to}`, error);
        }),
      );
      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Legacy methods kept for exception module compatibility
  async sendExceptionSubmitted(email: string, name: string, workshopTitle: string) {
    if (!this.resend) return;
    const html = this.emailWrapper('#FBBC04', 'Exception Request Received', `
      <h2 style="color: #202124;">Hi ${name},</h2>
      <p>Your exception request to attend <strong>${workshopTitle}</strong> has been submitted.</p>
      <p>Our admin team will review your request and you'll be notified of the decision.</p>
    `);
    try {
      await this.resend.emails.send({ from: this.from, to: email, subject: `Exception Request Received - ${workshopTitle}`, html });
    } catch (error) {
      this.logger.error('Failed to send exception submitted email', error);
    }
  }

  async sendExceptionApproved(email: string, name: string, workshop: { title: string; date: string; time: string; venue: string }, registrationId: string) {
    if (!this.resend) return;
    const qrDataUrl = await this.generateQRCode(registrationId);
    const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');

    const html = this.emailWrapper('#34A853', 'Exception Approved!', `
      <h2 style="color: #202124;">Hi ${name},</h2>
      <p>Your exception request has been approved! You are now registered for <strong>${workshop.title}</strong>.</p>
      ${this.workshopDetailsBlock(workshop)}
      <div style="text-align: center; margin: 20px 0;">
        <p>Your check-in QR code:</p>
        <img src="cid:qrcode" alt="QR Code" style="width: 200px;" />
      </div>
    `);

    try {
      await this.resend.emails.send({
        from: this.from, to: email, subject: `Exception Approved - ${workshop.title}`, html,
        attachments: [{ filename: 'qrcode.png', content: qrBase64, contentId: 'qrcode' }],
      });
    } catch (error) {
      this.logger.error('Failed to send exception approved email', error);
    }
  }

  async sendExceptionRejected(email: string, name: string, workshopTitle: string) {
    if (!this.resend) return;
    const html = this.emailWrapper('#EA4335', 'Exception Request Update', `
      <h2 style="color: #202124;">Hi ${name},</h2>
      <p>Unfortunately, your exception request to attend <strong>${workshopTitle}</strong> was not approved at this time.</p>
      <p>If you have questions, please reach out to the GDG Kolachi team.</p>
    `);
    try {
      await this.resend.emails.send({ from: this.from, to: email, subject: `Exception Request Update - ${workshopTitle}`, html });
    } catch (error) {
      this.logger.error('Failed to send exception rejected email', error);
    }
  }
}
