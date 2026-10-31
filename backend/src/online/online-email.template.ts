import { escapeHtml } from '../credits/credits.util';
import { emailLayout } from '../email/email-layout';

export interface OnlineJoinInput {
  /** The attendee's personal /join/<token> link (check in + join). */
  joinUrl: string;
  /** The raw meeting link, shown as a fallback under the button. */
  meetingUrl?: string | null;
  /** Free text: meeting ID, passcode, dial-in, agenda. Line breaks kept. */
  meetingDetails?: string | null;
  /** Whether checking in earns a Google Cloud credits link. */
  creditsEnabled?: boolean;
}

/**
 * The "how to join" card used in every email to an online attendee. The big
 * button goes through the personal join link, so joining also checks them in
 * (and, when credits are on, hands them the credits link). The raw meeting
 * link stays visible underneath in case the button is blocked.
 */
export function onlineJoinBlock(input: OnlineJoinInput): string {
  const joinUrl = escapeHtml(input.joinUrl);
  const details = input.meetingDetails?.trim()
    ? `<div style="margin: 14px 0 0; padding: 12px 14px; background: #F8F9FA; border-radius: 6px; color: #202124; font-size: 14px; white-space: pre-line; text-align: left;">${escapeHtml(input.meetingDetails.trim())}</div>`
    : '';
  const fallback = input.meetingUrl
    ? `<p style="margin: 14px 0 0; font-size: 12px; color: #5F6368;">Meeting link: <a href="${escapeHtml(input.meetingUrl)}" style="color: #1A73E8; word-break: break-all;">${escapeHtml(input.meetingUrl)}</a></p>`
    : '';
  const credits = input.creditsEnabled
    ? `<p style="margin: 10px 0 0; font-size: 13px; color: #188038;"><strong>☁️ Check in with this button to get your Google Cloud credits link.</strong></p>`
    : '';

  return `
      <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #4285F4;">
        <h3 style="margin: 0 0 6px; color: #202124;">💻 How to join</h3>
        <p style="color: #5F6368; margin: 0 0 16px; font-size: 14px;">Use your personal link. It checks you in and opens the session.</p>
        <a href="${joinUrl}" style="background: #4285F4; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
          Check in &amp; join the session
        </a>
        ${credits}
        ${details}
        ${fallback}
      </div>
    `;
}

export interface MeetingReminderInput extends OnlineJoinInput {
  name: string;
  eventTitle: string;
  /** "Saturday, 31 October 2026 · 7:00 PM PKT" */
  startsAtText: string;
  /** Minutes until the start when the email is sent (may be <= 0). */
  minutesUntilStart: number | null;
  venue?: string | null;
  specialInstructions?: string | null;
}

export function reminderLead(minutes: number | null): string {
  if (minutes === null) return 'is coming up soon';
  if (minutes <= 1) return 'is starting now';
  if (minutes <= 120) return `starts in ${minutes} minutes`;
  return 'is coming up';
}

export function meetingReminderSubject(
  eventTitle: string,
  minutes: number | null,
): string {
  const title = eventTitle.replace(/[\r\n]+/g, ' ').trim();
  if (minutes !== null && minutes <= 1) return `🔴 Starting now: ${title}`;
  if (minutes !== null && minutes <= 120)
    return `⏰ Starting in ${minutes} minutes: ${title}`;
  return `🔔 Reminder: ${title}`;
}

/** The "starting soon" email for an online session. Every value is HTML-escaped. */
export function renderMeetingReminderEmail(input: MeetingReminderInput): {
  subject: string;
  html: string;
  text: string;
} {
  const lead = reminderLead(input.minutesUntilStart);
  const instructions = input.specialInstructions?.trim()
    ? `
      <div style="background: #E8F0FE; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <p style="margin: 0; color: #1A73E8;"><strong>📋 Event Instructions:</strong></p>
        <div style="margin: 8px 0 0; color: #202124; white-space: pre-line;">${escapeHtml(input.specialInstructions.trim())}</div>
      </div>`
    : '';

  const html = emailLayout(
    '#4285F4',
    `Your session ${escapeHtml(lead)}`,
    `
      <h2 style="color: #202124; margin: 0 0 10px;">Hi ${escapeHtml(input.name)} 👋</h2>
      <p style="margin: 0;"><strong>${escapeHtml(input.eventTitle)}</strong> ${escapeHtml(lead)}. Grab a coffee, find a quiet spot and join a couple of minutes early.</p>
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4285F4;">
        <h3 style="margin: 0 0 12px; color: #202124;">${escapeHtml(input.eventTitle)}</h3>
        <p style="margin: 4px 0;"><strong>🕐 When:</strong> ${escapeHtml(input.startsAtText)}</p>
        ${input.venue ? `<p style="margin: 4px 0;"><strong>💻 Where:</strong> ${escapeHtml(input.venue)}</p>` : ''}
      </div>
      ${onlineJoinBlock(input)}
      ${instructions}
      <p style="color: #5F6368; font-size: 13px; margin: 20px 0 0;">See you in a bit! 🎉</p>
    `,
  );

  const text = [
    `Hi ${input.name},`,
    '',
    `${input.eventTitle} ${lead}.`,
    `When: ${input.startsAtText}`,
    ...(input.venue ? [`Where: ${input.venue}`] : []),
    '',
    `Check in & join the session: ${input.joinUrl}`,
    ...(input.creditsEnabled
      ? ['Checking in with this link gets you your Google Cloud credits link.']
      : []),
    ...(input.meetingDetails?.trim() ? ['', input.meetingDetails.trim()] : []),
    ...(input.meetingUrl ? ['', `Meeting link: ${input.meetingUrl}`] : []),
    ...(input.specialInstructions?.trim()
      ? ['', input.specialInstructions.trim()]
      : []),
    '',
    '-- GDG Kolachi',
  ].join('\n');

  return {
    subject: meetingReminderSubject(input.eventTitle, input.minutesUntilStart),
    html,
    text,
  };
}
