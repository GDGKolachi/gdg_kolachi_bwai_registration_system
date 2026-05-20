import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamFormationConfig } from '../entities/team-formation-config.entity';
import { Event } from '../entities/event.entity';
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
}
