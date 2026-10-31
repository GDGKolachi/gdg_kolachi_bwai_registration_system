/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call -- raw SQL rows */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EmailService } from '../email/email.service';
import { CreditsService } from '../credits/credits.service';
import {
  checkinWindow,
  eventStartsAt,
  formatStart,
  verifyJoinToken,
} from './online.util';

/** Who has a seat: the same rule the manual reminder uses, plus people already checked in. */
const SEATED = ['shortlisted', 'confirmed', 'attended'];

/** TypeORM's postgres `query()` returns [rows, count] for UPDATE ... RETURNING. */
function rowsOf(result: any): any[] {
  return Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === 'number'
    ? result[0]
    : result;
}

@Injectable()
export class OnlineService {
  private readonly logger = new Logger(OnlineService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly email: EmailService,
    private readonly credits: CreditsService,
  ) {}

  private async q(sql: string, params: any[] = []): Promise<any[]> {
    return rowsOf(await this.db.query(sql, params));
  }

  // ------------------------------------------------------------- reminders

  private async loadEvent(eventId: string) {
    const [event] = await this.q(`SELECT * FROM events WHERE id = $1`, [
      eventId,
    ]);
    if (!event) throw new NotFoundException('Event not found');
    if (!event.is_online)
      throw new BadRequestException('This is not an online event.');
    return event;
  }

  private reminderContent(event: any, now = new Date()) {
    const startsAt = eventStartsAt(event.date, event.time);
    return {
      title: event.title,
      venue: event.venue,
      special_instructions: event.special_instructions,
      meeting_url: event.meeting_url,
      meeting_details: event.meeting_details,
      credits_enabled: !!(event.credits_enabled && event.credits_claim_url),
      startsAtText: formatStart(event.date, event.time),
      minutesUntilStart: startsAt
        ? Math.round((startsAt.getTime() - now.getTime()) / 60_000)
        : null,
    };
  }

  /** Seated attendees who are not checked in yet. */
  private async reminderRecipients(eventId: string) {
    const rows = await this.q(
      `SELECT r.id, a.email, a.name
         FROM registrations r JOIN attendees a ON a.id = r.attendee_id
        WHERE r.event_id = $1 AND r.deleted_at IS NULL AND r.acknowledgement_expired = false
          AND r.checked_in = false AND r.status IN ('shortlisted', 'confirmed')
        ORDER BY a.name`,
      [eventId],
    );
    return rows.map((r) => ({
      email: r.email,
      name: r.name,
      registrationId: r.id,
    }));
  }

  /**
   * Online events whose reminder is due: enabled, not yet sent, and now is
   * between `meeting_reminder_minutes` before the start and 15 minutes after
   * it (so a restart around the start time does not lose the email).
   */
  async dueReminderEventIds(now = new Date()): Promise<string[]> {
    const rows = await this.q(
      `SELECT id, date, time, meeting_reminder_minutes FROM events
        WHERE is_online = true AND meeting_reminder_enabled = true
          AND meeting_reminder_sent_at IS NULL AND status <> 'disabled'`,
    );
    return rows
      .filter((e) => {
        const start = eventStartsAt(e.date, e.time);
        if (!start) return false;
        const from =
          start.getTime() - (e.meeting_reminder_minutes ?? 30) * 60_000;
        return (
          now.getTime() >= from &&
          now.getTime() <= start.getTime() + 15 * 60_000
        );
      })
      .map((e) => e.id);
  }

  /**
   * Sends the reminder to every seated attendee. Claims the event first
   * (sets meeting_reminder_sent_at only if still empty) so two instances, or
   * the scheduler and an admin, never both send it. `force` is the admin's
   * "Send now", which sends even if it already went out.
   */
  async sendReminder(eventId: string, opts: { force?: boolean } = {}) {
    const event = await this.loadEvent(eventId);
    const claimed = await this.q(
      `UPDATE events SET meeting_reminder_sent_at = now()
        WHERE id = $1 ${opts.force ? '' : 'AND meeting_reminder_sent_at IS NULL'}
        RETURNING id`,
      [eventId],
    );
    if (claimed.length === 0)
      return { sent: 0, failed: 0, skipped: 'already_sent' };

    const recipients = await this.reminderRecipients(eventId);
    const result = recipients.length
      ? await this.email.sendMeetingReminderBatch(
          recipients,
          this.reminderContent(event),
        )
      : { sent: 0, failed: 0 };
    await this.q(
      `UPDATE events SET meeting_reminder_sent_count = $2 WHERE id = $1`,
      [eventId, result.sent],
    );
    this.logger.log(
      `Meeting reminder for "${event.title}": ${result.sent} sent, ${result.failed} failed`,
    );
    return { ...result, recipients: recipients.length };
  }

  /**
   * Sends one copy to the admin so they can see it before attendees do. The
   * join button points at a placeholder registration on purpose: a real one
   * would check that attendee in when the admin clicks it.
   */
  async sendTestReminder(eventId: string, to: string) {
    if (!to)
      throw new BadRequestException(
        'Enter an email address to send the test to.',
      );
    const event = await this.loadEvent(eventId);
    const result = await this.email.sendMeetingReminderBatch(
      [
        {
          email: to,
          name: 'Organizer (test)',
          registrationId: '00000000-0000-0000-0000-000000000000',
        },
      ],
      this.reminderContent(event),
    );
    return { ...result, to };
  }

  // --------------------------------------------------------- self check-in

  private async loadByToken(token: string) {
    const registrationId = verifyJoinToken(token);
    if (!registrationId)
      throw new NotFoundException('This join link is not valid.');
    const [row] = await this.q(
      `SELECT r.id, r.status, r.checked_in, r.checked_in_at, r.deleted_at, r.acknowledgement_expired,
              a.name, e.id AS event_id, e.title, e.date, e.time, e.venue, e.is_online,
              e.meeting_url, e.meeting_details, e.credits_enabled, e.credits_claim_url
         FROM registrations r
         JOIN attendees a ON a.id = r.attendee_id
         JOIN events e ON e.id = r.event_id
        WHERE r.id = $1`,
      [registrationId],
    );
    if (!row || row.deleted_at || !row.is_online)
      throw new NotFoundException('This join link is not valid.');
    return row;
  }

  private async view(row: any) {
    const startsAt = eventStartsAt(row.date, row.time);
    const window = checkinWindow(startsAt);
    const seated = SEATED.includes(row.status) && !row.acknowledgement_expired;
    const creditsOn = !!(row.credits_enabled && row.credits_claim_url);
    return {
      first_name: (row.name || '').trim().split(/\s+/)[0] || '',
      event: {
        title: row.title,
        venue: row.venue,
        starts_at: startsAt,
        starts_at_text: formatStart(row.date, row.time),
      },
      seated,
      checked_in: !!row.checked_in,
      checked_in_at: row.checked_in_at,
      checkin: window,
      // The meeting itself only goes to people who have a seat.
      meeting_url: seated ? row.meeting_url : null,
      meeting_details: seated ? row.meeting_details : null,
      credits: {
        enabled: creditsOn,
        status: creditsOn
          ? await this.credits.currentStatus(row.id)
          : 'not_queued',
        confirm_url:
          creditsOn && row.checked_in
            ? await this.credits.confirmUrlFor(row.id)
            : null,
      },
    };
  }

  async publicGet(token: string) {
    return this.view(await this.loadByToken(token));
  }

  /**
   * The attendee's own check-in. Allowed for seated registrations while the
   * window is open; marks them attended (keeping the first check-in time) and
   * queues the credits email exactly like a QR scan at the door does.
   */
  async selfCheckin(token: string) {
    const row = await this.loadByToken(token);
    if (!SEATED.includes(row.status) || row.acknowledgement_expired) {
      throw new ForbiddenException(
        'Your registration does not have a seat for this session, so you cannot check in.',
      );
    }
    const window = checkinWindow(eventStartsAt(row.date, row.time));
    if (window.state === 'not_open') {
      throw new BadRequestException(
        'Check-in has not opened yet. Come back a few minutes before the start.',
      );
    }
    if (window.state === 'closed') {
      throw new BadRequestException('Check-in for this session has closed.');
    }

    await this.q(
      `UPDATE registrations SET status = 'attended', checked_in = true,
              checked_in_at = COALESCE(checked_in_at, now())
        WHERE id = $1`,
      [row.id],
    );
    await this.credits.queueOnCheckin(row.id, 'self_checkin');
    return this.view(await this.loadByToken(token));
  }
}
