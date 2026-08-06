import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamFormationConfig } from '../entities/team-formation-config.entity';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { TeamAssignmentService } from './team-assignment.service';
import { AdminService } from '../admin/admin.service';
import { EmailService } from '../email/email.service';
import { TEAM_DEPOSIT, paymentState, canSubmitPayment, hoursRemaining } from './team-payment';

/** "#195 · GYB Coders", or "#195" when the team was never named. */
function teamLabel(team: { team_number?: number | null; name?: string | null }): string {
  return [team.team_number != null ? `#${team.team_number}` : null, team.name]
    .filter(Boolean)
    .join(' · ') || 'your team';
}

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(TeamFormationConfig)
    private configRepo: Repository<TeamFormationConfig>,
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
    private assignment: TeamAssignmentService,
    private adminService: AdminService,
    private emailService: EmailService,
  ) {}

  async listForEvent(eventId: string) {
    const config = await this.assignment.getOrCreateConfig(eventId);
    const teams = await this.teamRepo.find({
      where: { event_id: eventId },
      relations: ['members', 'members.registration', 'members.registration.attendee'],
      order: { team_number: 'ASC' },
    });

    return teams.map((team) => {
      const members = team.members || [];
      const statusCounts: Record<string, number> = {};
      for (const m of members) {
        const status = m.registration?.status;
        if (!status) continue;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
      return {
        ...team,
        member_count: members.length,
        status_counts: statusCounts,
        below_minimum: members.length < config.min_team_size,
        payment_state: paymentState(team),
        payment_hours_remaining: hoursRemaining(team.payment_deadline),
      };
    });
  }

  /**
   * Who is on the team right now, and who speaks for it. Soft-deleted members
   * are dropped — they should never be emailed — and the captain falls back
   * from the explicit pointer, to whoever registered the team, to the first
   * live member, so a team is never unreachable just because that pointer was
   * never set.
   */
  private rosterOf(team: Team) {
    const live = (team.members || [])
      .map(m => m.registration)
      .filter(r => r && !r.deleted_at);

    const captain =
      live.find(r => r.id === team.captain_registration_id) ||
      live.find(r => r.is_captain) ||
      live[0] ||
      null;

    return { live, captain };
  }

  // ── Team messaging ───────────────────────────────────────────────────────

  /**
   * Send one admin-written email per team: the captain on To, the rest of the
   * roster on CC. Anything a team needs to hear — venue changes, what to bring,
   * a schedule fix — reaches everyone at once, in a thread they can all reply to.
   *
   * Each team gets its own send rather than one blast to everybody, so the
   * roster block and CC list are that team's own, and one failure costs one
   * team rather than the whole batch.
   */
  async messageTeams(
    teamIds: string[],
    opts: { subject?: string; message: string; includeEventDetails?: boolean; includeRoster?: boolean },
  ) {
    const message = (opts.message || '').trim();
    if (!message) throw new BadRequestException('A message is required.');

    const succeeded: Array<{ team_id: string; team_label: string; captain_email: string; cc_count: number }> = [];
    const failed: Array<{ team_id: string; reason: string }> = [];

    for (const teamId of teamIds) {
      const team = await this.teamRepo.findOne({
        where: { id: teamId },
        relations: ['members', 'members.registration', 'members.registration.attendee', 'event'],
      });
      if (!team) { failed.push({ team_id: teamId, reason: 'Team not found' }); continue; }

      const { live, captain } = this.rosterOf(team);
      if (live.length === 0) { failed.push({ team_id: teamId, reason: 'Team has no active members' }); continue; }

      const captainEmail = captain?.attendee?.email;
      if (!captainEmail) { failed.push({ team_id: teamId, reason: 'No captain email' }); continue; }

      const label = teamLabel(team);
      const eventTitle = team.event?.title || 'the hackathon';

      const result = await this.emailService.sendTeamMessageEmail({
        captainEmail,
        captainName: captain.attendee?.name || 'there',
        memberEmails: live.map(r => r.attendee?.email).filter(Boolean) as string[],
        teamLabel: label,
        eventTitle,
        subject: (opts.subject || '').trim() || `${eventTitle} — a message for ${label}`,
        message,
        event: opts.includeEventDetails === false ? null : team.event || null,
        roster: opts.includeRoster === false ? [] : live.map(r => ({
          name: r.attendee?.name || 'Member',
          email: r.attendee?.email || '',
          is_captain: r.id === captain.id,
        })),
      });

      if (!result?.sent) {
        failed.push({ team_id: teamId, reason: result?.error ? 'Email failed to send' : 'Email failed to send' });
        continue;
      }

      succeeded.push({
        team_id: team.id,
        team_label: label,
        captain_email: captainEmail,
        cc_count: result.cc_count ?? 0,
      });
    }

    return { sent: succeeded.length, succeeded, failed };
  }

  // ── Deposit confirmation ─────────────────────────────────────────────────

  /**
   * Ask a team for its deposit and start the clock. Re-requesting is allowed
   * and resets the window — that is how an admin grants an extension, and it
   * un-expires a team without any separate "extend" concept.
   *
   * Teams that already paid are skipped rather than re-asked, so a careless
   * bulk select cannot demand money twice.
   */
  async requestTeamPayment(teamIds: string[]) {
    const succeeded: Array<{ team_id: string; team_label: string; captain_email: string }> = [];
    const failed: Array<{ team_id: string; reason: string }> = [];

    for (const teamId of teamIds) {
      const team = await this.teamRepo.findOne({
        where: { id: teamId },
        relations: ['members', 'members.registration', 'members.registration.attendee', 'event'],
      });
      if (!team) { failed.push({ team_id: teamId, reason: 'Team not found' }); continue; }

      if (team.payment_status === 'paid') {
        failed.push({ team_id: teamId, reason: 'Already paid — not re-requested' });
        continue;
      }

      const { live, captain } = this.rosterOf(team);
      if (live.length === 0) { failed.push({ team_id: teamId, reason: 'Team has no active members' }); continue; }

      const captainEmail = captain?.attendee?.email;
      if (!captainEmail) { failed.push({ team_id: teamId, reason: 'No captain email' }); continue; }

      const now = new Date();
      const deadline = new Date(now.getTime() + TEAM_DEPOSIT.windowHours * 3_600_000);
      const label = teamLabel(team);

      const appUrl = (process.env.APP_URL || 'http://localhost:3000')
        .replace(/\/api\/?$/, '')
        .replace(/\/$/, '');

      const result = await this.emailService.sendTeamPaymentRequestEmail({
        captainEmail,
        captainName: captain.attendee?.name || 'there',
        memberEmails: live.map(r => r.attendee?.email).filter(Boolean) as string[],
        teamLabel: label,
        memberCount: live.length,
        eventTitle: team.event?.title || 'the hackathon',
        deadline,
        submitUrl: `${appUrl}/teams/${team.id}/deposit`,
        deposit: TEAM_DEPOSIT,
      });

      if (!result?.sent) {
        // The clock must not start on a team that was never told, otherwise
        // they expire without ever having received the request.
        failed.push({ team_id: teamId, reason: 'Email failed to send — request not recorded' });
        continue;
      }

      team.payment_status = 'requested';
      team.payment_requested_at = now;
      team.payment_deadline = deadline;
      team.payment_rejection_reason = null;
      await this.teamRepo.save(team);

      succeeded.push({ team_id: team.id, team_label: label, captain_email: captainEmail });
    }

    return { requested: succeeded.length, succeeded, failed };
  }

  /**
   * Public: the captain reports what they sent. Only reachable while the window
   * is open or after a rejection, so a team cannot submit against a request
   * that was never made.
   */
  async submitTeamPayment(
    teamId: string,
    body: { reference: string; sender_name: string; note?: string },
  ) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    if (team.payment_status === 'paid') {
      throw new BadRequestException('This team’s deposit is already confirmed.');
    }
    if (!canSubmitPayment(team)) {
      throw new BadRequestException(
        team.payment_status === 'submitted'
          ? 'Your deposit details are already with us and awaiting review.'
          : 'This team has not been asked for a deposit.',
      );
    }

    const reference = (body.reference || '').trim();
    const senderName = (body.sender_name || '').trim();
    if (!reference) throw new BadRequestException('Transaction ID is required.');
    if (!senderName) throw new BadRequestException('The name on the sending account is required.');

    team.payment_status = 'submitted';
    team.payment_submitted_at = new Date();
    team.payment_reference = reference;
    team.payment_sender_name = senderName;
    team.payment_note = (body.note || '').trim() || null;
    team.payment_rejection_reason = null;
    await this.teamRepo.save(team);

    return { status: 'submitted', team_id: team.id };
  }

  /** Public: what the deposit page needs, with nothing sensitive in it. */
  async getPublicPaymentView(teamId: string) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members', 'members.registration', 'event'],
    });
    if (!team) throw new NotFoundException('Team not found');

    const live = (team.members || [])
      .map(m => m.registration)
      .filter(r => r && !r.deleted_at);

    return {
      team_id: team.id,
      team_label: teamLabel(team),
      event_title: team.event?.title || 'the hackathon',
      member_count: live.length,
      state: paymentState(team),
      deadline: team.payment_deadline,
      hours_remaining: hoursRemaining(team.payment_deadline),
      can_submit: canSubmitPayment(team),
      rejection_reason: team.payment_rejection_reason,
      submitted: team.payment_status === 'submitted' || team.payment_status === 'paid'
        ? { reference: team.payment_reference, sender_name: team.payment_sender_name }
        : null,
      deposit: TEAM_DEPOSIT,
    };
  }

  /**
   * Admin: accept the deposit, and shortlist the roster.
   *
   * The request email tells the team that verification is what shortlists them,
   * so this does it rather than leaving an admin to remember a second click —
   * otherwise the email promises something the system does not do.
   *
   * Shortlisting goes through AdminService.bulkUpdateStatus, so the transition
   * rules, QR generation and entry-pass emails are the same ones every other
   * path uses. Members already past shortlisted are left alone by those rules;
   * a failure there does not undo the payment, which is a separate fact.
   */
  async confirmTeamPayment(teamId: string, adminId: string) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members', 'members.registration'],
    });
    if (!team) throw new NotFoundException('Team not found');

    team.payment_status = 'paid';
    team.payment_confirmed_at = new Date();
    team.payment_confirmed_by = adminId;
    team.payment_rejection_reason = null;
    await this.teamRepo.save(team);

    const memberIds = (team.members || [])
      .map((m) => m.registration)
      .filter((r) => r && !r.deleted_at && r.status !== 'shortlisted')
      .map((r) => r.id);

    let shortlisted = 0;
    let shortlistFailed: Array<{ id: string; error: string }> = [];
    if (memberIds.length > 0) {
      const result = await this.adminService.bulkUpdateStatus(memberIds, 'shortlisted');
      shortlisted = result.succeeded.length;
      shortlistFailed = result.failed || [];
    }

    return { status: 'paid', team_id: team.id, shortlisted, shortlist_failed: shortlistFailed };
  }

  /**
   * Admin: send it back. The team stays able to resubmit, which is the point —
   * a wrong transaction ID should not cost them their place.
   */
  async rejectTeamPayment(teamId: string, reason: string) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    if (team.payment_status !== 'submitted') {
      throw new BadRequestException('Only a submitted deposit can be rejected.');
    }

    team.payment_status = 'rejected';
    team.payment_rejection_reason = (reason || '').trim() || 'Could not verify this transaction.';
    await this.teamRepo.save(team);

    return { status: 'rejected', team_id: team.id };
  }

  /**
   * One team with its full roster, for the admin record drawer. `listForEvent`
   * returns every team in the event and only summarises each member, which is
   * far too much payload to answer "who else is on this person's team?" —
   * this loads a single team and keeps each member's registration and attendee
   * intact so the drawer can show the whole team without another round trip.
   *
   * Members come back captain-first, then by name, so the roster reads the same
   * way whichever member you opened it from.
   */
  async getTeamDetail(teamId: string) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members', 'members.registration', 'members.registration.attendee'],
    });
    if (!team) throw new NotFoundException('Team not found');

    const config = await this.assignment.getOrCreateConfig(team.event_id);
    const statusCounts: Record<string, number> = {};

    const members = (team.members || [])
      .filter((m) => m.registration)
      .map((m) => {
        const r = m.registration;
        const isCaptain = r.is_captain || team.captain_registration_id === r.id;
        // Deleted members stay in the roster, flagged — a team that silently
        // loses a row reads as a team that was always that size.
        if (!r.deleted_at) {
          statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        }
        return {
          ...r,
          is_captain: isCaptain,
          member_id: m.id,
          role_bucket_snapshot: m.role_bucket_snapshot,
          domain_snapshot: m.domain_snapshot,
          is_anchor: m.is_anchor,
          assigned_at: m.assigned_at,
          assigned_by: m.assigned_by,
        };
      })
      .sort((a, b) => {
        if (a.is_captain !== b.is_captain) return a.is_captain ? -1 : 1;
        return (a.attendee?.name || '').localeCompare(b.attendee?.name || '');
      });

    const liveCount = members.filter((m) => !m.deleted_at).length;

    const { members: _members, ...teamFields } = team;
    return {
      ...teamFields,
      members,
      member_count: liveCount,
      status_counts: statusCounts,
      below_minimum: liveCount < config.min_team_size,
      min_team_size: config.min_team_size,
      max_team_size: config.max_team_size,
      payment_state: paymentState(team),
      payment_hours_remaining: hoursRemaining(team.payment_deadline),
      deposit: TEAM_DEPOSIT,
    };
  }

  /**
   * Shortlist / transition an entire team in one call. Every rule that matters
   * (valid transitions, QR generation, emails) already lives in
   * AdminService.bulkUpdateStatus — this only fans the roster into it.
   */
  async updateTeamStatus(teamId: string, status: string) {
    const team = await this.teamRepo.findOne({
      where: { id: teamId },
      relations: ['members'],
    });
    if (!team) throw new NotFoundException('Team not found');

    const registrationIds = (team.members || []).map((m) => m.registration_id);
    const result = await this.adminService.bulkUpdateStatus(registrationIds, status);

    return {
      team_id: team.id,
      requested_status: status,
      succeeded: result.succeeded.length,
      failed: result.failed,
    };
  }

  async getConfig(eventId: string) {
    return this.assignment.getOrCreateConfig(eventId);
  }

  async updateConfig(eventId: string, data: Partial<TeamFormationConfig>) {
    const cfg = await this.assignment.getOrCreateConfig(eventId);
    const merged = { ...cfg, ...data };
    const { max_team_size, target_developers_per_team, target_designers_per_team, target_others_per_team } = merged;
    const sum = (target_developers_per_team ?? 0) + (target_designers_per_team ?? 0) + (target_others_per_team ?? 0);
    if (sum !== max_team_size) {
      throw new BadRequestException(
        `Role targets must add up to max team size. ${target_developers_per_team} + ${target_designers_per_team} + ${target_others_per_team} = ${sum}, expected ${max_team_size}.`,
      );
    }
    Object.assign(cfg, data);
    return this.configRepo.save(cfg);
  }

  async optimize(eventId: string) {
    return this.assignment.rebalance(eventId);
  }

  async lock(eventId: string) {
    return this.assignment.lockTeams(eventId);
  }

  async unlockTeam(teamId: string) {
    return this.assignment.unlockTeam(teamId);
  }

  async moveMember(teamId: string, registrationId: string, adminId: string) {
    return this.assignment.moveMember(teamId, registrationId, adminId);
  }

  async swapMembers(registrationIdA: string, registrationIdB: string, adminId: string) {
    return this.assignment.swapMembers(registrationIdA, registrationIdB, adminId);
  }

  /**
   * Public, unauthenticated lookup: an attendee finds their hackathon team by
   * email + name. Visible live (no lock gate).
   */
  async publicTeamLookup(eventId: string, email: string, name: string) {
    if (!email?.trim() || !name?.trim()) {
      throw new BadRequestException('Both email and name are required.');
    }

    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['event_type'],
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.event_type?.slug !== 'hackathon') {
      throw new BadRequestException('Team lookup is only available for Hackathon events.');
    }

    const config = await this.configRepo.findOne({ where: { event_id: eventId } });
    if (!config?.teams_published) {
      return { found: false, reason: 'not_published' as const };
    }

    const registration = await this.registrationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.attendee', 'a')
      .where('r.event_id = :eventId', { eventId })
      .andWhere('LOWER(a.email) = :email', { email: email.trim().toLowerCase() })
      .andWhere('LOWER(a.name) = :name', { name: name.trim().toLowerCase() })
      .getOne();

    if (!registration) {
      return { found: false, reason: 'not_registered' as const };
    }

    const member = await this.memberRepo.findOne({
      where: { registration_id: registration.id },
      relations: ['team', 'team.members', 'team.members.registration', 'team.members.registration.attendee'],
    });

    if (!member || !member.team) {
      return { found: false, reason: 'not_assigned' as const };
    }

    const team = member.team;
    return {
      found: true as const,
      event: { id: event.id, title: event.title },
      team: {
        team_number: team.team_number,
        name: team.name,
        primary_domain: team.primary_domain,
        status: team.status,
      },
      members: (team.members || []).map((m) => ({
        name: m.registration?.attendee?.name ?? 'Unknown',
        role_bucket: m.role_bucket_snapshot,
        is_anchor: m.is_anchor,
        is_you: m.registration_id === registration.id,
      })),
    };
  }
}
