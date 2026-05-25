import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamFormationConfig } from '../entities/team-formation-config.entity';
import { Registration } from '../entities/registration.entity';
import { Event } from '../entities/event.entity';
import { RoleCategory } from '../entities/role-category.entity';

export interface AssignmentResult {
  team: Team;
  isNewTeam: boolean;
  roleBucket: string;
}

@Injectable()
export class TeamAssignmentService {
  constructor(
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(TeamFormationConfig)
    private configRepo: Repository<TeamFormationConfig>,
    @InjectRepository(Registration)
    private regRepo: Repository<Registration>,
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(RoleCategory)
    private roleCategoryRepo: Repository<RoleCategory>,
  ) {}

  async getOrCreateConfig(eventId: string): Promise<TeamFormationConfig> {
    let cfg = await this.configRepo.findOne({ where: { event_id: eventId } });
    if (!cfg) {
      cfg = this.configRepo.create({ event_id: eventId });
      cfg = await this.configRepo.save(cfg);
    }
    return cfg;
  }

  /**
   * Streaming greedy assignment: returns the team the attendee was placed on.
   * Creates a new team (anchor) only when no existing team scores positively
   * AND the team cap hasn't been reached.
   */
  async assignAtCheckin(registrationId: string, adminId?: string): Promise<AssignmentResult> {
    const registration = await this.regRepo.findOne({
      where: { id: registrationId },
      relations: ['event', 'event.event_type'],
    });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.event?.event_type?.slug !== 'hackathon') {
      throw new BadRequestException('Team assignment only applies to Hackathon events');
    }

    const existingMembership = await this.memberRepo.findOne({
      where: { registration_id: registrationId },
      relations: ['team'],
    });
    if (existingMembership) {
      return { team: existingMembership.team, isNewTeam: false, roleBucket: existingMembership.role_bucket_snapshot ?? 'other' };
    }

    const cfg = await this.getOrCreateConfig(registration.event_id);

    // Resolve role bucket — prefer cached, otherwise look up via role_categories.
    let roleBucket = registration.role_bucket;
    if (!roleBucket && registration.attendee_id) {
      const att = await this.regRepo.manager.findOne('attendees', { where: { id: registration.attendee_id } } as any);
      const roleName = (att as any)?.best_describes_you;
      if (roleName) {
        const cat = await this.roleCategoryRepo.findOne({ where: { role_name: roleName } });
        roleBucket = cat?.bucket || 'other';
      }
    }
    roleBucket = roleBucket || 'other';

    const teams = await this.teamRepo.find({
      where: { event_id: registration.event_id },
      relations: ['members'],
      order: { team_number: 'ASC' },
    });

    const openTeams = teams.filter((t) => t.status !== 'locked' && (t.members?.length ?? 0) < cfg.max_team_size);

    // Hard constraints: a candidate team must (a) match the member's domain and
    // (b) still have room for the member's role group under its per-team target.
    const roleTarget = this.targetFor(roleBucket, cfg);
    const candidateTeams = openTeams.filter((t) => {
      if (registration.domain && t.primary_domain !== registration.domain) return false;
      if (this.roleGroupCount(t.members || [], roleBucket) >= roleTarget) return false;
      return true;
    });

    // Score within the hard-constrained candidates by role composition.
    let best: { team: Team; score: number } | null = null;
    for (const team of candidateTeams) {
      const score = this.scoreTeam(team, roleBucket, registration.domain, cfg);
      if (best === null || score > best.score) best = { team, score };
    }

    let chosenTeam: Team;
    let isNewTeam = false;

    if (best) {
      // A team satisfying domain + role-target constraints exists — use the best.
      chosenTeam = best.team;
    } else if (teams.length < cfg.max_teams) {
      // No constraint-satisfying team → start a new one seeded with this domain.
      const nextNumber = (teams[teams.length - 1]?.team_number ?? 0) + 1;
      chosenTeam = this.teamRepo.create({
        event_id: registration.event_id,
        team_number: nextNumber,
        primary_domain: registration.domain || null,
        status: 'forming',
        created_by: adminId || null,
      });
      chosenTeam = await this.teamRepo.save(chosenTeam);
      isNewTeam = true;
    } else {
      // Absolute last resort: team cap reached and no constraint-satisfying team.
      // Prefer a domain-matching open team, otherwise any open team.
      const domainOpen = registration.domain
        ? openTeams.filter((t) => t.primary_domain === registration.domain)
        : openTeams;
      const pool = domainOpen.length > 0 ? domainOpen : openTeams;
      let anyBest: { team: Team; score: number } | null = null;
      for (const team of pool) {
        const score = this.scoreTeam(team, roleBucket, registration.domain, cfg);
        if (anyBest === null || score > anyBest.score) anyBest = { team, score };
      }
      if (anyBest) {
        chosenTeam = anyBest.team;
      } else {
        throw new BadRequestException(
          `All ${cfg.max_teams} teams are at full capacity (${cfg.max_team_size} members each). Manual placement required.`,
        );
      }
    }

    const member = this.memberRepo.create({
      team_id: chosenTeam.id,
      registration_id: registration.id,
      role_bucket_snapshot: roleBucket,
      domain_snapshot: registration.domain || null,
      is_anchor: isNewTeam,
      assigned_by: adminId ? `admin:${adminId}` : 'auto',
    });
    await this.memberRepo.save(member);

    // Cache role_bucket on the registration for future runs.
    if (!registration.role_bucket) {
      registration.role_bucket = roleBucket;
      await this.regRepo.save(registration);
    }

    // Refresh team with members for caller.
    const refreshed = await this.teamRepo.findOne({
      where: { id: chosenTeam.id },
      relations: ['members', 'members.registration', 'members.registration.attendee'],
    });
    return { team: refreshed!, isNewTeam, roleBucket };
  }

  private scoreTeam(team: Team, roleBucket: string, domain: string | null, cfg: TeamFormationConfig): number {
    const members = team.members || [];
    let score = 0;

    if (domain && team.primary_domain && domain === team.primary_domain) {
      score += cfg.domain_match_weight;
    }

    const target = this.targetFor(roleBucket, cfg);
    const current = this.roleGroupCount(members, roleBucket);

    if (current < target) score += cfg.role_gap_weight;
    else score -= cfg.role_overflow_penalty;

    // Developer soft cap
    if (roleBucket === 'developer' && this.roleGroupCount(members, 'developer') >= cfg.soft_cap_developers_per_team) {
      score -= cfg.role_overflow_penalty * 2;
    }

    // Spread: prefer less-full teams slightly
    score -= cfg.near_full_penalty * (members.length / cfg.max_team_size);

    return score;
  }

  private bucketCounts(members: TeamMember[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const m of members) {
      const b = m.role_bucket_snapshot || 'other';
      counts[b] = (counts[b] || 0) + 1;
    }
    return counts;
  }

  /** Resolve which target group a bucket belongs to. */
  private roleGroup(bucket: string): 'developer' | 'designer' | 'other' {
    if (bucket === 'developer') return 'developer';
    if (bucket === 'designer' || bucket === 'product_designer') return 'designer';
    return 'other';
  }

  /** Count members sharing the same target group as the given bucket. */
  private roleGroupCount(members: TeamMember[], bucket: string): number {
    const group = this.roleGroup(bucket);
    return members.filter((m) => this.roleGroup(m.role_bucket_snapshot || 'other') === group).length;
  }

  private targetFor(bucket: string, cfg: TeamFormationConfig): number {
    const group = this.roleGroup(bucket);
    if (group === 'developer') return cfg.target_developers_per_team;
    if (group === 'designer') return cfg.target_designers_per_team;
    return cfg.target_others_per_team;
  }

  /** True when a member set exceeds any per-team role-group target. */
  private exceedsRoleTargets(members: TeamMember[], cfg: TeamFormationConfig): boolean {
    let dev = 0;
    let des = 0;
    let oth = 0;
    for (const m of members) {
      const group = this.roleGroup(m.role_bucket_snapshot || 'other');
      if (group === 'developer') dev++;
      else if (group === 'designer') des++;
      else oth++;
    }
    return (
      dev > cfg.target_developers_per_team ||
      des > cfg.target_designers_per_team ||
      oth > cfg.target_others_per_team
    );
  }

  /** Pairwise swap pass: trade members between teams when it improves global score. */
  async rebalance(eventId: string): Promise<{ swapped: number }> {
    const cfg = await this.getOrCreateConfig(eventId);
    const teams = await this.teamRepo.find({
      where: { event_id: eventId },
      relations: ['members'],
    });
    let swapped = 0;
    let improved = true;
    let pass = 0;

    while (improved && pass < 5) {
      improved = false;
      pass++;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          if (teams[i].status === 'locked' || teams[j].status === 'locked') continue;
          const a = teams[i];
          const b = teams[j];
          for (const ma of a.members || []) {
            for (const mb of b.members || []) {
              // Domain hard constraint: only swap when each member is compatible
              // with the target team's domain.
              const aCanGoToB = !ma.domain_snapshot || !b.primary_domain || ma.domain_snapshot === b.primary_domain;
              const bCanGoToA = !mb.domain_snapshot || !a.primary_domain || mb.domain_snapshot === a.primary_domain;
              if (!aCanGoToB || !bCanGoToA) continue;

              const before =
                this.scoreTeamRaw(a, cfg) + this.scoreTeamRaw(b, cfg);
              // Swap snapshots
              const aMembersAfter = (a.members || []).map((m) => (m.id === ma.id ? mb : m));
              const bMembersAfter = (b.members || []).map((m) => (m.id === mb.id ? ma : m));
              // Role-target hard constraint: never swap into an over-target composition.
              if (this.exceedsRoleTargets(aMembersAfter, cfg) || this.exceedsRoleTargets(bMembersAfter, cfg)) continue;
              const after =
                this.scoreTeamRaw({ ...a, members: aMembersAfter } as Team, cfg) +
                this.scoreTeamRaw({ ...b, members: bMembersAfter } as Team, cfg);
              if (after > before + 0.01) {
                // Persist swap: move ma to b, mb to a
                ma.team_id = b.id;
                mb.team_id = a.id;
                await this.memberRepo.save([ma, mb]);
                a.members = aMembersAfter as TeamMember[];
                b.members = bMembersAfter as TeamMember[];
                swapped += 1;
                improved = true;
              }
            }
          }
        }
      }
    }
    return { swapped };
  }

  private scoreTeamRaw(team: Team, cfg: TeamFormationConfig): number {
    const members = team.members || [];
    if (members.length === 0) return 0;
    const counts = this.bucketCounts(members);
    let score = 0;
    // Reward target hits
    score += Math.min(counts['developer'] || 0, cfg.target_developers_per_team) * cfg.role_gap_weight;
    score += Math.min((counts['designer'] || 0) + (counts['product_designer'] || 0), cfg.target_designers_per_team) * cfg.role_gap_weight;
    const otherCount = members.length - (counts['developer'] || 0) - (counts['designer'] || 0) - (counts['product_designer'] || 0);
    score += Math.min(otherCount, cfg.target_others_per_team) * cfg.role_gap_weight;
    // Penalise dev overflow past soft cap
    if ((counts['developer'] || 0) > cfg.soft_cap_developers_per_team) {
      score -= ((counts['developer'] || 0) - cfg.soft_cap_developers_per_team) * cfg.role_overflow_penalty;
    }
    // Domain cohesion: reward matches, heavily penalise mismatches.
    if (team.primary_domain) {
      for (const m of members) {
        if (m.domain_snapshot === team.primary_domain) {
          score += cfg.domain_match_weight;
        } else if (m.domain_snapshot) {
          score -= cfg.domain_match_weight * 3;
        }
      }
    }
    return score;
  }

  async lockTeams(eventId: string): Promise<{ locked: number }> {
    const teams = await this.teamRepo.find({ where: { event_id: eventId } });
    const now = new Date();
    let locked = 0;
    for (const t of teams) {
      if (t.status !== 'locked') {
        t.status = 'locked';
        t.locked_at = now;
        locked++;
      }
    }
    await this.teamRepo.save(teams);
    return { locked };
  }

  async unlockTeam(teamId: string) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    team.status = 'forming';
    team.locked_at = null;
    return this.teamRepo.save(team);
  }

  async moveMember(teamId: string, registrationId: string, adminId: string): Promise<TeamMember> {
    const target = await this.teamRepo.findOne({ where: { id: teamId }, relations: ['members'] });
    if (!target) throw new NotFoundException('Target team not found');
    if (target.status === 'locked') throw new BadRequestException('Target team is locked');
    const cfg = await this.getOrCreateConfig(target.event_id);
    if ((target.members?.length ?? 0) >= cfg.max_team_size) {
      throw new BadRequestException('Target team is at maximum size');
    }
    const member = await this.memberRepo.findOne({ where: { registration_id: registrationId } });
    if (!member) throw new NotFoundException('Member not found');

    // Domain hard constraint: member's domain must match target team's domain.
    if (member.domain_snapshot && target.primary_domain && member.domain_snapshot !== target.primary_domain) {
      throw new BadRequestException(
        `Cannot move member to a team with a different domain. Member domain: "${member.domain_snapshot}", Team domain: "${target.primary_domain}".`,
      );
    }

    // Role-target hard constraint: target team must still have room in the member's role group.
    const roleBucket = member.role_bucket_snapshot || 'other';
    const roleTarget = this.targetFor(roleBucket, cfg);
    // Exclude the member from their current team's count (they're moving out), but only count the target team's existing members.
    const currentGroupCount = this.roleGroupCount(target.members || [], roleBucket);
    if (currentGroupCount >= roleTarget) {
      const group = this.roleGroup(roleBucket);
      throw new BadRequestException(
        `Target team already has its full quota of ${group} members (${currentGroupCount}/${roleTarget}). Move not allowed.`,
      );
    }

    member.team_id = teamId;
    member.assigned_by = `admin:${adminId}`;
    return this.memberRepo.save(member);
  }
}
