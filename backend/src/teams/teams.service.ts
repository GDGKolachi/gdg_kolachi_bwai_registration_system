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
      };
    });
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
