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

  async sendRegistrationConfirmation(email: string, name: string, workshop: { title: string; date: string; time: string; venue: string }, registrationId: string) {
    if (!this.resend) {
      this.logger.warn('Resend not configured, skipping email');
      return;
    }

    const qrDataUrl = await this.generateQRCode(registrationId);
    const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Registration Confirmed - ${workshop.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #4285F4; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">GDG Kolachi - Build with AI</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Hi ${name},</h2>
              <p>Your registration for <strong>${workshop.title}</strong> has been confirmed!</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Date:</strong> ${workshop.date}</p>
                <p><strong>Time:</strong> ${workshop.time}</p>
                <p><strong>Venue:</strong> ${workshop.venue}</p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <p>Show this QR code at check-in:</p>
                <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
              </div>
              <p style="color: #666; font-size: 12px;">GDG Kolachi - Build with AI Workshop Series</p>
            </div>
          </div>
        `,
        attachments: [{
          filename: 'qrcode.png',
          content: qrBase64,
          contentId: 'qrcode',
        }],
      });
    } catch (error) {
      this.logger.error('Failed to send registration email', error);
    }
  }

  async sendExceptionSubmitted(email: string, name: string, workshopTitle: string) {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Exception Request Received - ${workshopTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #FBBC04; color: #202124; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Exception Request Received</h1>
            </div>
            <div style="padding: 30px;">
              <h2>Hi ${name},</h2>
              <p>Your exception request to attend <strong>${workshopTitle}</strong> has been submitted.</p>
              <p>Our admin team will review your request and you'll be notified of the decision.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send exception submitted email', error);
    }
  }

  async sendExceptionApproved(email: string, name: string, workshop: { title: string; date: string; time: string; venue: string }, registrationId: string) {
    if (!this.resend) return;
    const qrDataUrl = await this.generateQRCode(registrationId);
    const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '');

    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Exception Approved - ${workshop.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #34A853; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Exception Approved!</h1>
            </div>
            <div style="padding: 30px;">
              <h2>Hi ${name},</h2>
              <p>Your exception request has been approved! You are now registered for <strong>${workshop.title}</strong>.</p>
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Date:</strong> ${workshop.date}</p>
                <p><strong>Time:</strong> ${workshop.time}</p>
                <p><strong>Venue:</strong> ${workshop.venue}</p>
              </div>
              <div style="text-align: center;">
                <p>Your check-in QR code:</p>
                <img src="cid:qrcode" alt="QR Code" style="width: 200px;" />
              </div>
            </div>
          </div>
        `,
        attachments: [{
          filename: 'qrcode.png',
          content: qrBase64,
          contentId: 'qrcode',
        }],
      });
    } catch (error) {
      this.logger.error('Failed to send exception approved email', error);
    }
  }

  async sendExceptionRejected(email: string, name: string, workshopTitle: string) {
    if (!this.resend) return;
    try {
      await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: `Exception Request Update - ${workshopTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #EA4335; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">Exception Request Update</h1>
            </div>
            <div style="padding: 30px;">
              <h2>Hi ${name},</h2>
              <p>Unfortunately, your exception request to attend <strong>${workshopTitle}</strong> was not approved at this time.</p>
              <p>If you have questions, please reach out to the GDG Kolachi team.</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send exception rejected email', error);
    }
  }
}
