import { escapeHtml } from './credits.util';

export interface CreditsEmailInput {
  firstName: string;
  eventTitle: string;
  /** Tracked claim URL (our API, which redirects to the event's claim link). */
  claimUrl: string;
  /** Tracked video URL, or null when the event has no walkthrough video. */
  videoUrl: string | null;
  /** `<origin>/credits/<token>` — the one-button confirm page. */
  confirmUrl: string;
  /** `<origin>/images/credits-video-thumb.png` */
  thumbnailUrl: string;
}

export const CREDITS_STEPS = [
  'Open the link in an Incognito / private window.',
  'Sign in with a personal @gmail.com account.',
  'Click Claim Credit.',
  'Create a Google Developer Program profile if asked.',
  'Scan the "verify you\'re human" QR code with your phone.',
  'Wait 3-5 minutes, click Open Billing Account and look for a billing account with "GDP Credit" in its name.',
];

export function creditsSubject(eventTitle: string): string {
  // Header values must stay on one line.
  return `Claim your Google Cloud credits – ${eventTitle.replace(/[\r\n]+/g, ' ').trim()}`;
}

export function firstNameOf(fullName: string): string {
  return (fullName || '').trim().split(/\s+/)[0] || 'there';
}

/**
 * HTML + plain-text body of the credits email. Same visual style as the
 * wrapper in email.service.ts (copied, not imported — that file is untouched).
 * Every interpolated value is HTML-escaped.
 */
export function renderCreditsEmail(input: CreditsEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml(input.firstName);
  const title = escapeHtml(input.eventTitle);
  const claimUrl = escapeHtml(input.claimUrl);
  const confirmUrl = escapeHtml(input.confirmUrl);

  const videoBlock = input.videoUrl
    ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${escapeHtml(input.videoUrl)}" style="text-decoration: none;">
          <img src="${escapeHtml(input.thumbnailUrl)}" alt="Watch the 2-minute walkthrough" width="480" style="width: 100%; max-width: 480px; height: auto; border-radius: 8px; border: 1px solid #e0e0e0; display: block; margin: 0 auto;" />
        </a>
        <p style="margin: 8px 0 0; font-size: 14px;">
          <a href="${escapeHtml(input.videoUrl)}" style="color: #1A73E8;">Watch the 2-minute walkthrough</a>
        </p>
      </div>`
    : '';

  const stepsHtml = CREDITS_STEPS.map(
    (s) => `<li style="margin: 4px 0;">${escapeHtml(s)}</li>`,
  ).join('');

  const body = `
      <h2 style="color: #202124;">Hi ${name},</h2>
      <p>Thanks for joining us at <strong>${title}</strong>! Claiming your Google Cloud credits takes about five minutes.</p>
      ${videoBlock}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${claimUrl}" style="background: #4285F4; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
          Claim your credits
        </a>
      </div>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <h3 style="margin: 0 0 12px; color: #202124;">Quick steps</h3>
        <ol style="margin: 0; padding-left: 20px; color: #202124;">${stepsHtml}</ol>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <p style="color: #5F6368; margin: 0 0 12px; font-size: 14px;">Done? Let us know:</p>
        <a href="${confirmUrl}" style="background: #34A853; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
          I've redeemed my credits
        </a>
      </div>
      <p style="color: #5F6368; font-size: 14px;">Stuck? Raise your hand and a volunteer will come to you.</p>
    `;

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: #4285F4; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">GDG Kolachi - Build with AI</h1>
          <p style="margin: 8px 0 0; font-size: 16px; opacity: 0.9;">Claim your Google Cloud credits</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          ${body}
        </div>
        <div style="padding: 16px; background: #202124; color: #9AA0A6; text-align: center; font-size: 12px;">
          <p style="margin: 0;">GDG Kolachi - Build with AI Workshop Series</p>
          <p style="margin: 4px 0 0;">This is an automated message. Please do not reply.</p>
        </div>
      </div>
    `;

  const textLines = [
    `Hi ${input.firstName},`,
    '',
    `Thanks for joining us at ${input.eventTitle}! Claiming your Google Cloud credits takes about five minutes.`,
    '',
  ];
  if (input.videoUrl) {
    textLines.push(`Watch the 2-minute walkthrough: ${input.videoUrl}`, '');
  }
  textLines.push(
    `Claim your credits: ${input.claimUrl}`,
    '',
    'Quick steps:',
    ...CREDITS_STEPS.map((s, i) => `${i + 1}. ${s}`),
    '',
    `Done? Let us know you've redeemed your credits: ${input.confirmUrl}`,
    '',
    'Stuck? Raise your hand and a volunteer will come to you.',
    '',
    '-- GDG Kolachi',
  );

  return {
    subject: creditsSubject(input.eventTitle),
    html,
    text: textLines.join('\n'),
  };
}
