import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamFormationConfig } from '../entities/team-formation-config.entity';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { TeamAssignmentService } from './team-assignment.service';

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
  ) {}

  async listForEvent(eventId: string) {
    return this.teamRepo.find({
      where: { event_id: eventId },
      relations: ['members', 'members.registration', 'members.registration.attendee'],
      order: { team_number: 'ASC' },
    });
  }

  async getConfig(eventId: string) {
    return this.assignment.getOrCreateConfig(eventId);
  }

  async updateConfig(eventId: string, data: Partial<TeamFormationConfig>) {
    const cfg = await this.assignment.getOrCreateConfig(eventId);
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
