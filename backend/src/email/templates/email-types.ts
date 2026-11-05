import {
  escapeHtml,
  firstNameOf,
  formatEventDate,
  formatEventTime,
  formatInstant,
  PUBLIC_SITE_FALLBACK,
} from './format';
import type { Accent, Kit } from './kit';
import type { EmailCopy } from './copy';
import { formatStart, joinUrl } from '../../online/online.util';

/** Event fields any email may use. Every field but the title is optional. */
export interface EmailEvent {
  title: string;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  is_online?: boolean | null;
  special_instructions?: string | null;
  meeting_url?: string | null;
  meeting_details?: string | null;
  credits_enabled?: boolean | null;
  credits_claim_url?: string | null;
  /** Per-event theme override; null means the global theme. */
  email_theme?: string | null;
}

export const CREDITS_STEPS = [
  'Open the link in an Incognito / private window.',
  'Sign in with a personal @gmail.com account.',
  'Click Claim Credit.',
  'Create a Google Developer Program profile if asked.',
  'Scan the "verify you\'re human" QR code with your phone.',
  'Wait 3-5 minutes, click Open Billing Account and look for a billing account with "GDP Credit" in its name.',
];

/** Content-ID of the inline credits video thumbnail. */
export const CREDITS_THUMB_CID = 'credits-video-thumb';

/** The rendered pieces a definition's body receives. */
export interface BodyCopy {
  heading: string;
  /** Escaped, formatted admin copy (paragraphs split by blank lines). */
  intro: string;
  /** The CTA label as plain text, or null when the email has no main button. */
  cta: string | null;
}

export interface AttachmentHints {
  /** Data to encode as the ticket QR (cid:qrcode). */
  qr?: string;
  /** Attach the credits walkthrough thumbnail (cid:credits-video-thumb). */
  creditsThumb?: boolean;
}

export interface EmailDefinition<D> {
  name: string;
  description: string;
  /** Short eyebrow / header line; part of the design, not editable. */
  label: string;
  accent: Accent;
  header: 'hero' | 'wordmark';
  mascots: boolean;
  /** Whether the CTA label is used. 'optional': only shown when the admin sets one. */
  cta: 'required' | 'optional' | 'none';
  defaults: EmailCopy;
  preheader: string;
  /** Variables the admin can use, with a one-line description each. */
  variables: Record<string, string>;
  vars(d: D): Record<string, string>;
  body(d: D, k: Kit, c: BodyCopy): string;
  attachments?(d: D): AttachmentHints;
  sample(variant?: string): D;
}

// ------------------------------------------------------------- shared parts

const COMMON_VARS = {
  name: 'Full name',
  first_name: 'First name',
  event_title: 'Event title',
  date: 'Event date, e.g. Saturday, 29 November 2026',
  time: 'Start time, e.g. 9:30 AM',
  venue: 'Venue',
};

function eventVars(
  name: string,
  e: EmailEvent | null | undefined,
): Record<string, string> {
  return {
    name: name || 'there',
    first_name: firstNameOf(name),
    event_title: e?.title || '',
    date: formatEventDate(e?.date),
    time: formatEventTime(e?.time),
    venue: e?.venue || '',
  };
}

function venueHtml(k: Kit, e: EmailEvent): string {
  const venue = e.venue || '';
  const url = e.is_online ? /(https?:\/\/\S+)/.exec(venue)?.[1] : undefined;
  return url ? `Online &middot; ${k.link(url, url)}` : escapeHtml(venue);
}

function eventDetails(k: Kit, e: EmailEvent): string {
  return k.details(e.title, [
    ['Date', escapeHtml(formatEventDate(e.date))],
    ['Time', escapeHtml(e.time ? `${formatEventTime(e.time)} PKT` : '')],
    [e.is_online ? 'Online' : 'Venue', venueHtml(k, e)],
  ]);
}

function instructions(
  k: Kit,
  text: string | null | undefined,
  title = 'Event instructions',
): string {
  return text?.trim()
    ? k.panel({ tone: 'info', title, html: k.preformatted(text) })
    : '';
}

function organizerNote(k: Kit, message: string | null | undefined): string {
  return message?.trim()
    ? k.panel({
        tone: 'warning',
        title: 'A note from the organizers',
        html: k.preformatted(message),
      })
    : '';
}

function ticket(k: Kit, registrationId: string): string {
  return k.panel({
    tone: 'success',
    dashed: true,
    center: true,
    title: 'Your event ticket',
    html: `${k.p('Show this QR code at the venue to check in.', { muted: true, size: 14, center: true })}
      <img src="cid:qrcode" alt="Ticket QR code" width="200" height="200" style="display:block;width:200px;height:200px;margin:0 auto;border:8px solid #FFFFFF;" />
      <p style="margin:12px 0 0;">${k.mono(`Registration ${registrationId}`)}</p>`,
  });
}

/**
 * The "How to join" card for an online attendee. The button goes through the
 * personal join link, so joining also checks them in (and, with credits on,
 * hands out the credits link); the raw meeting link is the fallback.
 */
function joinCard(
  k: Kit,
  e: EmailEvent,
  link: string,
  label = 'Check in & join the session',
): string {
  const credits = e.credits_enabled
    ? k.p(
        '<strong>Check in with this button to get your Google Cloud credits link.</strong>',
        { size: 14, center: true },
      )
    : '';
  const details = e.meeting_details?.trim()
    ? `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 12px;"><tr><td style="padding:12px 14px;background:${k.t.cardBg};border:1px solid ${k.t.border};text-align:left;">${k.preformatted(e.meeting_details)}</td></tr></table>`
    : '';
  const fallback = e.meeting_url
    ? k.p(`Meeting link: ${k.link(e.meeting_url, e.meeting_url)}`, {
        muted: true,
        size: 13,
        center: true,
      })
    : '';
  return k.panel({
    tone: 'info',
    dashed: true,
    center: true,
    title: 'How to join',
    html: `${k.p('Use your personal link. It checks you in and opens the session.', { muted: true, size: 14, center: true })}
      ${k.button(label, link)}${credits}${details}${fallback}`,
  });
}

const SAMPLE_REG = '00000000-0000-0000-0000-000000000000';

const SAMPLE_IN_PERSON: EmailEvent = {
  title: 'DevFest Karachi 2026',
  date: '2026-11-29',
  time: '09:30',
  venue: 'Expo Centre Karachi, Hall 3',
  is_online: false,
  special_instructions:
    'Doors open at 9:00 AM. Bring your laptop, charger and a valid ID.\nLunch and swag are on us.',
  credits_enabled: true,
};

const SAMPLE_ONLINE: EmailEvent = {
  title: 'Forward Deployed: The State of Software Engineering, 2026',
  date: '2026-10-31',
  time: '19:00',
  venue: 'Online (Google Meet)',
  is_online: true,
  special_instructions:
    'Talk 1 starts at 7 PM and Talk 2 at 8 PM. Please join a few minutes early.',
  meeting_url: 'https://meet.google.com/abc-defg-hij',
  meeting_details:
    'Meeting ID: abc-defg-hij\nDial-in: +1 555-0100 · PIN 123 456 789#',
  credits_enabled: true,
};

const sampleEvent = (variant?: string) =>
  variant === 'online' ? SAMPLE_ONLINE : SAMPLE_IN_PERSON;
const ackUrl = (id: string) =>
  `${PUBLIC_SITE_FALLBACK}/api/registrations/${id}/acknowledge`;

// -------------------------------------------------------------- definitions

export interface TicketData {
  name: string;
  event: EmailEvent;
  registrationId: string;
  acknowledgeUrl: string;
  /** QR payload; ignored for online events. */
  qrData?: string | null;
}

const shortlisted: EmailDefinition<TicketData> = {
  name: 'Shortlisted / ticket',
  description:
    'Sent when an attendee is shortlisted. Carries the QR ticket (in person) or the join card (online) and the confirm button.',
  label: "You're shortlisted",
  accent: 'green',
  header: 'hero',
  mascots: true,
  cta: 'required',
  defaults: {
    subject: "🎉 You're shortlisted for {{event_title}}",
    heading: 'Congratulations {{first_name}}! 🎉',
    intro:
      'You have been **shortlisted** for **{{event_title}}**. Please confirm that you will attend so we can hold your seat.',
    cta_label: 'Confirm my spot',
  },
  preheader: 'Confirm your spot for {{event_title}} on {{date}}.',
  variables: {
    ...COMMON_VARS,
    join_link: 'Personal check-in & join link (online events)',
  },
  vars: (d) => ({
    ...eventVars(d.name, d.event),
    join_link: d.event.is_online ? joinUrl(d.registrationId) : '',
  }),
  attachments: (d) => (!d.event.is_online && d.qrData ? { qr: d.qrData } : {}),
  body(d, k, c) {
    const online = !!d.event.is_online;
    const important = online
      ? k.panel({
          tone: 'success',
          title: 'This is an online event',
          html: k.list([
            'Keep this email: the join button above is your personal link',
            'We will email you a reminder shortly before the session starts',
            'Be ready a few minutes before the scheduled time',
          ]),
        })
      : k.panel({
          tone: 'warning',
          title: 'Important',
          html: k.list([
            "Save or screenshot this email: you'll need the QR code for entry",
            'Arrive 15 minutes before the scheduled time',
            'Bring a valid ID matching your registration',
          ]),
        });
    return `${k.heading(c.heading)}${k.copy(c.intro)}${eventDetails(k, d.event)}
      ${c.cta ? k.button(c.cta, d.acknowledgeUrl) : ''}
      ${online ? joinCard(k, d.event, joinUrl(d.registrationId)) : d.qrData ? ticket(k, d.registrationId) : ''}
      ${instructions(k, d.event.special_instructions, 'Special instructions')}${important}`;
  },
  sample: (variant) => ({
    name: 'Ayesha Khan',
    event: sampleEvent(variant),
    registrationId: SAMPLE_REG,
    acknowledgeUrl: ackUrl(SAMPLE_REG),
    qrData: JSON.stringify({ registrationId: SAMPLE_REG, name: 'Ayesha Khan' }),
  }),
};

export interface ReminderData extends TicketData {
  customMessage?: string | null;
}

const reminder: EmailDefinition<ReminderData> = {
  name: 'Reminder (entry pass)',
  description:
    'Manual reminder from the registrations screen: entry pass or join card, instructions and an optional organizer note.',
  label: 'Reminder',
  accent: 'yellow',
  header: 'hero',
  mascots: false,
  cta: 'required',
  defaults: {
    subject: '🔔 Reminder: {{event_title}} on {{date}}',
    heading: 'Hi {{first_name}} 👋',
    intro:
      "This is a friendly reminder that you're shortlisted for **{{event_title}}**. Here is your entry pass and the important info one more time, so it's easy to find.",
    cta_label: 'Confirm my spot',
  },
  preheader: '{{event_title}}: {{date}} at {{time}}.',
  variables: {
    ...COMMON_VARS,
    join_link: 'Personal check-in & join link (online events)',
  },
  vars: (d) => ({
    ...eventVars(d.name, d.event),
    join_link: d.event.is_online ? joinUrl(d.registrationId) : '',
  }),
  attachments: (d) => (!d.event.is_online && d.qrData ? { qr: d.qrData } : {}),
  body(d, k, c) {
    const pass = d.event.is_online
      ? joinCard(k, d.event, joinUrl(d.registrationId))
      : d.qrData
        ? ticket(k, d.registrationId)
        : '';
    const confirm = c.cta
      ? `${k.p("Haven't confirmed yet? Confirm your spot now:", { muted: true, size: 14, center: true })}${k.button(c.cta, d.acknowledgeUrl)}`
      : '';
    return `${k.heading(c.heading)}${k.copy(c.intro)}${eventDetails(k, d.event)}${organizerNote(k, d.customMessage)}
      ${instructions(k, d.event.special_instructions)}${pass}${confirm}${k.p('See you there! 🎉', { muted: true, size: 14 })}`;
  },
  sample: (variant) => ({
    ...shortlisted.sample(variant),
    customMessage:
      'Registration desk opens at 9:00 AM. Parking is available at Gate 2.',
  }),
};

export interface MeetingReminderData {
  name: string;
  event: EmailEvent;
  joinUrl: string;
  startsAtText: string;
  minutesUntilStart: number | null;
}

export function startsIn(minutes: number | null): string {
  if (minutes === null) return 'soon';
  if (minutes <= 1) return 'now';
  if (minutes <= 120) return `in ${minutes} minutes`;
  return 'soon';
}

const meetingReminder: EmailDefinition<MeetingReminderData> = {
  name: 'Online session starting soon',
  description:
    'Sent automatically before an online session (default 30 minutes), or with "Send reminder now".',
  label: 'Starting soon',
  accent: 'blue',
  header: 'hero',
  mascots: true,
  cta: 'required',
  defaults: {
    subject: '⏰ {{event_title}} starts {{starts_in}}',
    heading: 'Hi {{first_name}} 👋',
    intro:
      '**{{event_title}}** starts {{starts_in}}. Grab a coffee, find a quiet spot and join a couple of minutes early.',
    cta_label: 'Check in & join the session',
  },
  preheader: 'Your personal join link is inside. Starts {{starts_in}}.',
  variables: {
    ...COMMON_VARS,
    join_link: 'Personal check-in & join link',
    starts_in: '"in 30 minutes", "now" or "soon"',
    minutes: 'Minutes until the start',
  },
  vars: (d) => ({
    ...eventVars(d.name, d.event),
    join_link: d.joinUrl,
    starts_in: startsIn(d.minutesUntilStart),
    minutes:
      d.minutesUntilStart === null
        ? ''
        : String(Math.max(0, d.minutesUntilStart)),
  }),
  body(d, k, c) {
    return `${k.heading(c.heading)}${k.copy(c.intro)}
      ${k.details(d.event.title, [
        ['When', escapeHtml(d.startsAtText)],
        ['Where', venueHtml(k, d.event)],
      ])}
      ${joinCard(k, d.event, d.joinUrl, c.cta || undefined)}
      ${instructions(k, d.event.special_instructions)}${k.p('See you in a bit! 🎉', { muted: true, size: 14 })}`;
  },
  sample: () => ({
    name: 'Ayesha Khan',
    event: SAMPLE_ONLINE,
    joinUrl: joinUrl(SAMPLE_REG),
    startsAtText: formatStart(SAMPLE_ONLINE.date!, SAMPLE_ONLINE.time!),
    minutesUntilStart: 30,
  }),
};

export interface WhatsappData {
  name: string;
  event: { title: string; email_theme?: string | null };
  groupUrl: string;
  customMessage?: string | null;
}

const whatsappGroup: EmailDefinition<WhatsappData> = {
  name: 'WhatsApp group invite',
  description: 'Only the group link, a button to it and an optional note.',
  label: 'Join the group',
  accent: 'whatsapp',
  header: 'hero',
  mascots: false,
  cta: 'required',
  defaults: {
    subject: 'Join the {{event_title}} WhatsApp group',
    heading: 'Hi {{first_name}} 👋',
    intro:
      'Everything else about **{{event_title}}** happens in the WhatsApp group: announcements, last-minute changes and questions. Please join now so you do not miss anything.',
    cta_label: 'Join the WhatsApp group',
  },
  preheader: 'Announcements and last-minute changes for {{event_title}}.',
  variables: {
    name: COMMON_VARS.name,
    first_name: COMMON_VARS.first_name,
    event_title: COMMON_VARS.event_title,
    group_link: 'WhatsApp group link',
  },
  vars: (d) => ({ ...eventVars(d.name, d.event), group_link: d.groupUrl }),
  body(d, k, c) {
    return `${k.heading(c.heading)}${k.copy(c.intro)}${organizerNote(k, d.customMessage)}
      ${c.cta ? k.button(c.cta, d.groupUrl) : ''}
      ${k.fallbackLink(d.groupUrl, 'If the button does not work, open this link on your phone:')}
      ${k.p('Please keep this link to yourself: it is meant for confirmed participants only.', { muted: true, size: 12 })}`;
  },
  sample: () => ({
    name: 'Ayesha Khan',
    event: SAMPLE_IN_PERSON,
    groupUrl: 'https://chat.whatsapp.com/SampleInviteCode',
    customMessage: 'Please introduce yourself in the group once you join!',
  }),
};

export interface NoticeData {
  name: string;
  event: { title: string; email_theme?: string | null };
  customMessage?: string | null;
}

const rejection: EmailDefinition<NoticeData> = {
  name: 'Application not selected',
  description:
    'Rejection notice. The standard explanation is always included; the organizer note is optional.',
  label: 'Application update',
  accent: 'red',
  header: 'wordmark',
  mascots: false,
  cta: 'optional',
  defaults: {
    subject: 'Application update — {{event_title}}',
    heading: 'Hi {{first_name}},',
    intro:
      'Thank you for your interest in **{{event_title}}**. After careful review, we regret to tell you that your application was **not selected** this time.',
    cta_label: null,
  },
  preheader: 'An update on your application for {{event_title}}.',
  variables: {
    name: COMMON_VARS.name,
    first_name: COMMON_VARS.first_name,
    event_title: COMMON_VARS.event_title,
  },
  vars: (d) => eventVars(d.name, d.event),
  body(d, k, c) {
    return `${k.heading(c.heading)}${k.copy(c.intro)}
      ${k.panel({ tone: 'neutral', html: k.p('We received a large number of applications and had limited spots available. This does not reflect on your abilities, and we encourage you to apply for future GDG Kolachi events!', { size: 15 }).replace('margin:0 0 16px', 'margin:0') })}
      ${organizerNote(k, d.customMessage)}
      ${k.p("Stay connected for upcoming opportunities. We'd love to see you at a future event! 🚀", { muted: true })}
      ${c.cta ? k.button(c.cta, PUBLIC_SITE_FALLBACK) : ''}`;
  },
  sample: () => ({
    name: 'Ayesha Khan',
    event: SAMPLE_IN_PERSON,
    customMessage:
      'Registrations for the January study jams open on 15 December.',
  }),
};

export interface AckExpiredData extends NoticeData {
  deadline?: Date | string | null;
}

const acknowledgementExpired: EmailDefinition<AckExpiredData> = {
  name: 'Confirmation window closed',
  description:
    'Sent to shortlisted people who never confirmed before the deadline: their seat has been released.',
  label: 'Confirmation window closed',
  accent: 'grey',
  header: 'wordmark',
  mascots: false,
  cta: 'optional',
  defaults: {
    subject: 'Your spot for {{event_title}} has been released',
    heading: 'Hi {{first_name}},',
    intro:
      'You were shortlisted for **{{event_title}}**, and we asked you to confirm your spot by **{{deadline}}**.',
    cta_label: null,
  },
  preheader: 'The confirmation deadline for {{event_title}} has passed.',
  variables: {
    name: COMMON_VARS.name,
    first_name: COMMON_VARS.first_name,
    event_title: COMMON_VARS.event_title,
    deadline: 'Confirmation deadline (or "the deadline")',
  },
  vars: (d) => ({
    ...eventVars(d.name, d.event),
    deadline: formatInstant(d.deadline) || 'the deadline',
  }),
  body(d, k, c) {
    return `${k.heading(c.heading)}${k.copy(c.intro)}
      ${k.panel({
        tone: 'danger',
        title: 'That deadline has now passed and we did not hear from you.',
        html: 'Your spot has been released to someone on the waiting list, so you will <strong>not be able to attend</strong>. Any entry pass sent to you earlier is no longer valid.',
      })}
      ${organizerNote(k, d.customMessage)}
      ${k.p('Seats are limited and we hold them only for people we can confirm, which is why the window is firm. If you believe this is a mistake, reply to the team that shortlisted you as soon as possible.', { muted: true })}
      ${k.p('We would genuinely like to see you at a future GDG Kolachi event. You stay on our list and will hear about the next one. 🚀', { muted: true })}
      ${c.cta ? k.button(c.cta, PUBLIC_SITE_FALLBACK) : ''}`;
  },
  sample: () => ({
    name: 'Ayesha Khan',
    event: SAMPLE_IN_PERSON,
    deadline: new Date('2026-11-25T18:59:00Z'),
    customMessage: '',
  }),
};

export interface DepositInfo {
  display: string;
  payeeName: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  swift: string;
  windowHours: number;
}

export interface TeamPaymentData {
  captainName: string;
  teamLabel: string;
  memberCount: number;
  eventTitle: string;
  deadline: Date;
  submitUrl: string;
  deposit: DepositInfo;
  event?: { email_theme?: string | null } | null;
}

const teamPaymentRequest: EmailDefinition<TeamPaymentData> = {
  name: 'Team deposit request',
  description:
    'Hackathon: asks a selected team captain (members on CC) for the refundable deposit.',
  label: "Confirm your team's spot",
  accent: 'yellow',
  header: 'hero',
  mascots: false,
  cta: 'required',
  defaults: {
    subject: 'Action needed: confirm {{team_name}} with a {{amount}} deposit',
    heading: 'Hi {{first_name}},',
    intro:
      'Your team **{{team_name}}** has a place at **{{event_title}}**. To lock it in, a refundable deposit is required within **{{window_hours}} hours**.',
    cta_label: 'I have paid: submit details',
  },
  preheader: 'Deposit of {{amount}} due by {{deadline}}.',
  variables: {
    name: 'Captain full name',
    first_name: 'Captain first name',
    event_title: COMMON_VARS.event_title,
    team_name: 'Team name / number',
    amount: 'Deposit amount',
    deadline: 'Payment deadline',
    window_hours: 'Hours allowed to pay',
    member_count: 'Members in the team',
  },
  vars: (d) => ({
    name: d.captainName,
    first_name: firstNameOf(d.captainName),
    event_title: d.eventTitle,
    team_name: d.teamLabel,
    amount: d.deposit.display,
    deadline: formatInstant(d.deadline),
    window_hours: String(d.deposit.windowHours),
    member_count: String(d.memberCount),
  }),
  body(d, k, c) {
    const dep = d.deposit;
    const mono = (v: string) =>
      `<span style="font-family:${k.t.monoFont};font-weight:600;word-break:break-all;">${escapeHtml(v)}</span>`;
    const amount = `
      <p style="margin:0;">${k.mono('Amount')}</p>
      <p style="margin:4px 0 14px;font-family:${k.t.headingFont};font-size:32px;font-weight:700;color:${k.t.text};">${escapeHtml(dep.display)}</p>
      <p style="margin:0;">${k.mono('Send to')}</p>
      <p style="margin:4px 0 6px;font-size:18px;font-weight:700;color:${k.t.text};">${escapeHtml(dep.payeeName)}</p>`;
    return `${k.heading(c.heading)}${k.copy(c.intro)}
      ${k.panel({ tone: 'warning', dashed: true, html: amount })}
      ${k.details(null, [
        ['Bank', escapeHtml(dep.bankName)],
        ['IBAN', mono(dep.iban)],
        ['Account', mono(dep.accountNumber)],
        ['SWIFT', mono(dep.swift)],
      ])}
      ${k.p('A local transfer needs only the IBAN. SWIFT is for international wires.', { muted: true, size: 13 })}
      ${k.panel({
        tone: 'info',
        title: 'One payment for the whole team',
        html: `${escapeHtml(dep.display)} covers all ${d.memberCount} member${d.memberCount === 1 ? '' : 's'}. Please do <strong>not</strong> send it once per person: the captain pays once on behalf of the team.`,
      })}
      ${k.panel({
        tone: 'warning',
        title: `Deadline: ${formatInstant(d.deadline)}`,
        html: `That is ${dep.windowHours} hours from now. After it passes your team is flagged for review. If you have paid and are simply late telling us, submit the details anyway and we will sort it out.`,
      })}
      ${k.p('Once you have sent it, tell us here:', { muted: true, size: 14, center: true })}
      ${c.cta ? k.button(c.cta, d.submitUrl) : ''}
      ${k.p('You will need the transaction ID from your transfer receipt.', { muted: true, size: 12, center: true })}
      ${k.panel({
        tone: 'success',
        title: 'What happens next',
        html: k.olist([
          `Send ${escapeHtml(dep.display)} to the account above.`,
          'Submit the transaction ID using the button above.',
          'We verify it, and once verified your team is <strong>shortlisted</strong> and everyone receives their entry pass by email.',
        ]),
      })}
      ${k.fallbackLink(d.submitUrl)}`;
  },
  sample: () => ({
    captainName: 'Ayesha Khan',
    teamLabel: 'Team 7 · Null Pointers',
    memberCount: 4,
    eventTitle: 'DevFest Karachi 2026 Hackathon',
    deadline: new Date('2026-11-20T13:00:00Z'),
    submitUrl: `${PUBLIC_SITE_FALLBACK}/teams/${SAMPLE_REG}/deposit`,
    deposit: {
      display: 'PKR 5,000',
      payeeName: 'GDG Kolachi',
      bankName: 'Sample Bank Ltd',
      accountNumber: '0123 4567 8901',
      iban: 'PK00SAMP0000001234567890',
      swift: 'SAMPPKKA',
      windowHours: 48,
    },
  }),
};

export interface TeamMessageData {
  captainName: string;
  teamLabel: string;
  eventTitle: string;
  customSubject: string;
  message: string;
  event?: EmailEvent | null;
  roster?: Array<{ name: string; email: string; is_captain: boolean }>;
}

const teamMessage: EmailDefinition<TeamMessageData> = {
  name: 'Message to a team',
  description:
    'Free-form note from the Teams screen. The subject and message are typed per send; this sets the frame around them.',
  label: 'A message for your team',
  accent: 'blue',
  header: 'wordmark',
  mascots: false,
  cta: 'none',
  defaults: {
    subject: '{{custom_subject}}',
    heading: 'Hi {{first_name}} and team 👋',
    intro: 'This is about your team **{{team_name}}** at **{{event_title}}**.',
    cta_label: null,
  },
  preheader: 'A message from the organizers about {{team_name}}.',
  variables: {
    name: 'Captain full name',
    first_name: 'Captain first name',
    event_title: COMMON_VARS.event_title,
    team_name: 'Team name / number',
    custom_subject: 'The subject typed when sending',
  },
  vars: (d) => ({
    ...eventVars(d.captainName, d.event ?? { title: d.eventTitle }),
    event_title: d.eventTitle,
    team_name: d.teamLabel,
    custom_subject: d.customSubject,
  }),
  body(d, k, c) {
    const roster = d.roster?.length
      ? k.details(
          'Your team',
          d.roster.map((m) => [
            m.is_captain ? 'Captain' : 'Member',
            `<strong>${escapeHtml(m.name)}</strong><br /><span style="color:${k.t.muted};font-size:13px;word-break:break-all;">${escapeHtml(m.email)}</span>`,
          ]),
        ) +
        k.p(
          'Everyone listed above received this email: the captain directly, the rest on CC.',
          { muted: true, size: 12 },
        )
      : '';
    return `${k.heading(c.heading)}${k.copy(c.intro)}
      ${k.panel({ tone: 'info', html: k.preformatted(d.message) })}
      ${d.event ? eventDetails(k, d.event) + instructions(k, d.event.special_instructions) : ''}
      ${roster}${k.p('See you there! 🎉', { muted: true, size: 14 })}`;
  },
  sample: () => ({
    captainName: 'Ayesha Khan',
    teamLabel: 'Team 7 · Null Pointers',
    eventTitle: 'DevFest Karachi 2026 Hackathon',
    customSubject: 'DevFest Karachi 2026 Hackathon — a message for Team 7',
    message:
      'Your mentor for Saturday is Talha. Please bring a laptop each and be at Table 7 by 9:30 AM.',
    event: SAMPLE_IN_PERSON,
    roster: [
      { name: 'Ayesha Khan', email: 'ayesha@example.com', is_captain: true },
      { name: 'Bilal Ahmed', email: 'bilal@example.com', is_captain: false },
      { name: 'Sana Iqbal', email: 'sana@example.com', is_captain: false },
    ],
  }),
};

export interface CreditsData {
  name: string;
  eventTitle: string;
  claimUrl: string;
  videoUrl: string | null;
  confirmUrl: string;
  event?: { email_theme?: string | null } | null;
}

const credits: EmailDefinition<CreditsData> = {
  name: 'Google Cloud credits',
  description:
    'Queued at check-in (QR scan or online self check-in): claim link, walkthrough video and the "I\'ve redeemed" button.',
  label: 'Claim your Google Cloud credits',
  accent: 'blue',
  header: 'hero',
  mascots: true,
  cta: 'required',
  defaults: {
    subject: 'Claim your Google Cloud credits – {{event_title}}',
    heading: 'Hi {{first_name}},',
    intro:
      'Thanks for joining us at **{{event_title}}**! Claiming your Google Cloud credits takes about five minutes.',
    cta_label: 'Claim your credits',
  },
  preheader: 'Five minutes to claim your Google Cloud credits.',
  variables: {
    name: COMMON_VARS.name,
    first_name: COMMON_VARS.first_name,
    event_title: COMMON_VARS.event_title,
    claim_link: 'Tracked claim link',
  },
  vars: (d) => ({
    name: d.name,
    first_name: firstNameOf(d.name),
    event_title: d.eventTitle,
    claim_link: d.claimUrl,
  }),
  attachments: (d) => (d.videoUrl ? { creditsThumb: true } : {}),
  body(d, k, c) {
    const video = d.videoUrl
      ? `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 0 20px;"><tr><td align="center">
          ${k.image(`cid:${CREDITS_THUMB_CID}`, 'Watch the 2-minute walkthrough', 480, 270, { link: d.videoUrl })}
          ${k.p(k.link('Watch the 2-minute walkthrough', d.videoUrl).replace('word-break:break-all;', ''), { size: 14, center: true }).replace('margin:0 0 16px', 'margin:8px 0 0')}
        </td></tr></table>`
      : '';
    return `${k.heading(c.heading)}${k.copy(c.intro)}${video}
      ${c.cta ? k.button(c.cta, d.claimUrl) : ''}
      ${k.panel({ tone: 'info', title: 'Quick steps', html: k.olist(CREDITS_STEPS.map(escapeHtml)) })}
      ${k.p('Done? Let us know:', { muted: true, size: 14, center: true })}
      ${k.button("I've redeemed my credits", d.confirmUrl, { variant: 'secondary' })}
      ${k.p('Stuck? Ask a volunteer, or reply in the event group and we will help.', { muted: true, size: 14 })}`;
  },
  sample: () => ({
    name: 'Ayesha Khan',
    eventTitle: SAMPLE_IN_PERSON.title,
    claimUrl: `${PUBLIC_SITE_FALLBACK}/api/public/credits/SAMPLE/claim`,
    videoUrl: `${PUBLIC_SITE_FALLBACK}/api/public/credits/SAMPLE/video`,
    confirmUrl: `${PUBLIC_SITE_FALLBACK}/credits/SAMPLE`,
  }),
};

export const EMAIL_DEFINITIONS = {
  shortlisted,
  reminder,
  meeting_reminder: meetingReminder,
  whatsapp_group: whatsappGroup,
  rejection,
  acknowledgement_expired: acknowledgementExpired,
  team_payment_request: teamPaymentRequest,
  team_message: teamMessage,
  credits,
};

export type EmailType = keyof typeof EMAIL_DEFINITIONS;
export type EmailData<T extends EmailType> =
  (typeof EMAIL_DEFINITIONS)[T] extends EmailDefinition<infer D> ? D : never;
export const EMAIL_TYPES = Object.keys(EMAIL_DEFINITIONS) as EmailType[];

/** Variants the preview can switch between (in-person vs online). */
export const SAMPLE_VARIANTS: Partial<Record<EmailType, string[]>> = {
  shortlisted: ['in_person', 'online'],
  reminder: ['in_person', 'online'],
};

export function isEmailType(v: unknown): v is EmailType {
  return typeof v === 'string' && v in EMAIL_DEFINITIONS;
}
