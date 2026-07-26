import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Registration } from '../entities/registration.entity';
import { Attendee } from '../entities/attendee.entity';
import { Event } from '../entities/event.entity';
import { RoleCategory } from '../entities/role-category.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamFormationConfig } from '../entities/team-formation-config.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { CreateTeamRegistrationDto } from './dto/create-team-registration.dto';
import {
  HACKATHON_DOMAINS,
  HACKATHON_ROLES,
  DEFAULT_ROLES,
  YEARS_EXPERIENCE_OPTIONS,
  PRIOR_HACKATHON_OPTIONS,
  SKILL_OPTIONS,
  MAX_SKILLS,
  AI_EXPERIENCE_OPTIONS,
  WORKED_TOGETHER_OPTIONS,
  MAX_BEST_PROJECT_LENGTH,
  MAX_IDEA_DESCRIPTION_LENGTH,
  MAX_MOTIVATION_LENGTH,
  REGISTRATION_MODE,
  TEAM_ORIGIN,
} from '../common/constants/hackathon.constants';

/** Shortlisting answers a solo registrant or a team captain must supply. */
interface ShortlistingAnswers {
  years_experience?: string;
  prior_hackathons?: string;
  ai_experience?: string;
  best_project?: string;
  motivation?: string;
}

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
    @InjectRepository(Attendee)
    private attendeeRepo: Repository<Attendee>,
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(RoleCategory)
    private roleCategoryRepo: Repository<RoleCategory>,
  ) {}

  async checkEmail(email: string) {
    const attendee = await this.attendeeRepo.findOne({ where: { email } });
    if (!attendee) return { registered: false, events: [] };
    const registrations = await this.registrationRepo.find({
      where: { attendee_id: attendee.id },
      relations: ['event', 'event.event_type'],
    });
    return {
      registered: registrations.length > 0,
      events: registrations.map((r) => ({
        event_id: r.event_id,
        title: r.event?.title,
        event_type_slug: r.event?.event_type?.slug,
      })),
    };
  }

  async register(dto: CreateRegistrationDto) {
    const event = await this.eventRepo.findOne({
      where: { id: dto.event_id },
      relations: ['event_type'],
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'open' && event.status !== 'registration_open') {
      throw new BadRequestException('Registration is not open for this event');
    }

    const regCount = await this.registrationRepo.count({ where: { event_id: dto.event_id } });
    if (regCount >= event.max_capacity) {
      throw new BadRequestException('Event is at full capacity');
    }

    const typeSlug = event.event_type?.slug;
    const isHackathon = typeSlug === 'hackathon';
    const isCommunityLounge = typeSlug === 'community-lounge';

    // Validate best_describes_you against the type-specific list
    const allowedRoles = isHackathon ? HACKATHON_ROLES : DEFAULT_ROLES;
    if (!allowedRoles.includes(dto.best_describes_you)) {
      throw new BadRequestException(
        `Invalid selection for "What best describes you?" — must be one of: ${allowedRoles.join(', ')}`,
      );
    }

    // Type-specific field validation
    let roleBucket: string | null = null;
    if (isHackathon) {
      if (!dto.domain || !HACKATHON_DOMAINS.includes(dto.domain)) {
        throw new BadRequestException('Hackathon registration requires a valid domain selection.');
      }
      const cat = await this.roleCategoryRepo.findOne({
        where: { role_name: dto.best_describes_you },
      });
      roleBucket = cat?.bucket || 'other';
      // Solo registrants answer the full shortlisting set.
      this.assertSkills(dto.skills);
      this.assertShortlistingAnswers(dto);
    } else if (isCommunityLounge) {
      const tracks = event.tracks || [];
      const slots = event.slots || [];
      if (!dto.track || !tracks.includes(dto.track)) {
        throw new BadRequestException('Please select a valid Track for this Community Lounge.');
      }
      if (!dto.slot || !slots.includes(dto.slot)) {
        throw new BadRequestException('Please select a valid Slot for this Community Lounge.');
      }
    } else {
      // Workshop / Talks
      if (!dto.motivation || !dto.motivation.trim()) {
        throw new BadRequestException('Please tell us why you want to attend.');
      }
    }

    let attendee = await this.attendeeRepo.findOne({ where: { email: dto.email } });
    if (attendee) {
      await this.assertNotAlreadyRegisteredForType(this.registrationRepo.manager, attendee.id, event);
    }

    if (!attendee) {
      attendee = this.attendeeRepo.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        university_org: dto.university_org,
        github: dto.github,
        linkedin: dto.linkedin,
        cnic: dto.cnic,
        gender: dto.gender,
        best_describes_you: dto.best_describes_you,
      });
      attendee = await this.attendeeRepo.save(attendee);
    } else {
      // Keep the latest role choice on the attendee.
      attendee.best_describes_you = dto.best_describes_you;
      attendee = await this.attendeeRepo.save(attendee);
    }

    const registration = this.registrationRepo.create({
      attendee_id: attendee.id,
      event_id: dto.event_id,
      motivation: isCommunityLounge ? null : (dto.motivation ?? null),
      status: 'pending',
      domain: isHackathon ? dto.domain : null,
      track: isCommunityLounge ? dto.track : null,
      slot: isCommunityLounge ? dto.slot : null,
      role_bucket: roleBucket,
      ambassador: dto.ambassador?.trim() || null,
      registration_mode: REGISTRATION_MODE.INDIVIDUAL,
      is_captain: false,
      years_experience: isHackathon ? (dto.years_experience ?? null) : null,
      prior_hackathons: isHackathon ? (dto.prior_hackathons ?? null) : null,
      skills: isHackathon ? (dto.skills ?? null) : null,
      ai_experience: isHackathon ? (dto.ai_experience ?? null) : null,
      portfolio_url: isHackathon ? (dto.portfolio_url?.trim() || null) : null,
      best_project: isHackathon ? (dto.best_project ?? null) : null,
    });
    const saved = await this.registrationRepo.save(registration);
    return saved;
  }

  /**
   * Captain submits the whole team in one payload. Everything runs in a single
   * transaction so a failure on member 4 never leaves members 1-3 behind.
   */
  async registerTeam(dto: CreateTeamRegistrationDto): Promise<{ team: Team; registrations: Registration[] }> {
    return this.registrationRepo.manager.transaction(async (manager) => {
      const event = await manager.findOne(Event, {
        where: { id: dto.event_id },
        relations: ['event_type'],
      });
      if (!event) throw new NotFoundException('Event not found');
      if (event.event_type?.slug !== 'hackathon') {
        throw new BadRequestException('Team registration is only available for Hackathon events');
      }
      if (event.status !== 'open' && event.status !== 'registration_open') {
        throw new BadRequestException('Registration is not open for this event');
      }

      // Same defaults as TeamAssignmentService.getOrCreateConfig, but through
      // `manager` so it joins this transaction. Importing TeamsModule here would
      // be circular — TeamsModule already depends on RegistrationsModule.
      let cfg = await manager.findOne(TeamFormationConfig, { where: { event_id: dto.event_id } });
      if (!cfg) {
        const created = await manager.save(manager.create(TeamFormationConfig, { event_id: dto.event_id }));
        // Re-read so the DB-side column defaults (min/max team size) are populated.
        cfg = await manager.findOneOrFail(TeamFormationConfig, { where: { id: created.id } });
      }
      if (!cfg.allow_self_registered_teams) {
        throw new BadRequestException('Team registration is not enabled for this event');
      }

      const members = dto.members || [];
      if (members.length < cfg.min_team_size || members.length > cfg.max_team_size) {
        throw new BadRequestException(
          `A team must have between ${cfg.min_team_size} and ${cfg.max_team_size} members.`,
        );
      }

      const captains = members.filter((m) => m.is_captain);
      if (captains.length !== 1) {
        throw new BadRequestException('A team must have exactly one captain');
      }
      const captain = captains[0];

      const seenEmails = new Set<string>();
      for (const m of members) {
        const key = m.email.trim().toLowerCase();
        if (seenEmails.has(key)) {
          throw new BadRequestException(`${m.email} appears more than once in this team.`);
        }
        seenEmails.add(key);
      }

      // Lock the event row so two captains cannot claim the same last seats.
      await manager.query('SELECT id FROM events WHERE id = $1 FOR UPDATE', [dto.event_id]);
      const regCount = await manager.count(Registration, { where: { event_id: dto.event_id } });
      if (regCount + members.length > event.max_capacity) {
        const remaining = Math.max(event.max_capacity - regCount, 0);
        throw new BadRequestException(
          `Not enough seats left for this team — ${remaining} seat(s) remaining but ${members.length} requested.`,
        );
      }

      if (!HACKATHON_DOMAINS.includes(dto.team.primary_domain)) {
        throw new BadRequestException('Team registration requires a valid domain selection.');
      }
      if (!WORKED_TOGETHER_OPTIONS.includes(dto.team.worked_together_before)) {
        throw new BadRequestException('Please tell us whether your team has worked together before.');
      }
      if (dto.team.has_idea) {
        if (!dto.team.idea_description || !dto.team.idea_description.trim()) {
          throw new BadRequestException('Please describe the idea your team wants to build.');
        }
        if (dto.team.idea_description.length > MAX_IDEA_DESCRIPTION_LENGTH) {
          throw new BadRequestException(
            `Your idea description must be ${MAX_IDEA_DESCRIPTION_LENGTH} characters or fewer.`,
          );
        }
      }

      for (const m of members) {
        if (!HACKATHON_ROLES.includes(m.best_describes_you)) {
          throw new BadRequestException(
            `${m.name}: invalid selection for "What best describes you?" — must be one of: ${HACKATHON_ROLES.join(', ')}`,
          );
        }
        this.assertSkills(m.skills, m.name);
      }

      // Only the captain answers the heavy questions; the rest stay light.
      this.assertShortlistingAnswers(captain, captain.name);

      const existingAttendees = await manager.find(Attendee, {
        where: { email: In(members.map((m) => m.email)) },
      });
      const attendeeByEmail = new Map(existingAttendees.map((a) => [a.email, a]));
      for (const m of members) {
        const existing = attendeeByEmail.get(m.email);
        if (existing) {
          await this.assertNotAlreadyRegisteredForType(manager, existing.id, event);
        }
      }

      const registrations: Registration[] = [];
      const roleBuckets: string[] = [];
      for (const m of members) {
        let attendee = attendeeByEmail.get(m.email);
        if (!attendee) {
          attendee = await manager.save(
            manager.create(Attendee, {
              name: m.name,
              email: m.email,
              phone: m.phone,
              university_org: m.university_org,
              github: m.github,
              linkedin: m.linkedin,
              cnic: m.cnic,
              gender: m.gender,
              best_describes_you: m.best_describes_you,
            }),
          );
        } else {
          attendee.best_describes_you = m.best_describes_you;
          attendee = await manager.save(attendee);
        }

        const cat = await manager.findOne(RoleCategory, { where: { role_name: m.best_describes_you } });
        const roleBucket = cat?.bucket || 'other';
        roleBuckets.push(roleBucket);

        const registration = await manager.save(
          manager.create(Registration, {
            attendee_id: attendee.id,
            event_id: dto.event_id,
            status: 'pending',
            registration_mode: REGISTRATION_MODE.TEAM,
            is_captain: m.is_captain,
            // The whole team shares the captain-chosen domain.
            domain: dto.team.primary_domain,
            role_bucket: roleBucket,
            motivation: m.motivation ?? null,
            ambassador: m.ambassador?.trim() || null,
            skills: m.skills,
            years_experience: m.years_experience ?? null,
            prior_hackathons: m.prior_hackathons ?? null,
            ai_experience: m.ai_experience ?? null,
            portfolio_url: m.portfolio_url?.trim() || null,
            best_project: m.best_project ?? null,
          }),
        );
        registrations.push(registration);
      }

      const maxRow = await manager
        .createQueryBuilder(Team, 't')
        .select('MAX(t.team_number)', 'max')
        .where('t.event_id = :eid', { eid: dto.event_id })
        .getRawOne<{ max: number | null }>();
      const teamNumber = Number(maxRow?.max ?? 0) + 1;

      const captainIndex = members.findIndex((m) => m.is_captain);
      const team = await manager.save(
        manager.create(Team, {
          event_id: dto.event_id,
          team_number: teamNumber,
          name: dto.team.name,
          primary_domain: dto.team.primary_domain,
          status: 'forming',
          origin: TEAM_ORIGIN.SELF_REGISTERED,
          has_idea: dto.team.has_idea,
          idea_description: dto.team.idea_description?.trim() || null,
          worked_together_before: dto.team.worked_together_before,
          captain_registration_id: registrations[captainIndex].id,
        }),
      );

      await manager.save(
        members.map((m, i) =>
          manager.create(TeamMember, {
            team_id: team.id,
            registration_id: registrations[i].id,
            role_bucket_snapshot: roleBuckets[i],
            domain_snapshot: dto.team.primary_domain,
            is_anchor: m.is_captain,
            assigned_by: TEAM_ORIGIN.SELF_REGISTERED,
          }),
        ),
      );

      return { team, registrations };
    });
  }

  /**
   * An attendee may hold one registration per event type. Takes an EntityManager
   * so the team path can run it inside its transaction.
   */
  private async assertNotAlreadyRegisteredForType(
    manager: EntityManager,
    attendeeId: string,
    event: Event,
  ): Promise<void> {
    const sameTypeExisting = await manager
      .createQueryBuilder(Registration, 'r')
      .leftJoin('r.event', 'e')
      .where('r.attendee_id = :aid', { aid: attendeeId })
      .andWhere('e.event_type_id = :etid', { etid: event.event_type_id })
      .getOne();
    if (!sameTypeExisting) return;
    if (event.allow_exceptions === false) {
      throw new BadRequestException(
        `This email is already registered for a ${event.event_type?.name} event.`,
      );
    }
    throw new BadRequestException(
      `This email is already registered for a ${event.event_type?.name} event. Please submit an exception request to change events.`,
    );
  }

  /**
   * Messages read "Ali Raza: please pick a skill" for team members and
   * "Please pick a skill" for a solo registrant.
   */
  private answerError(message: string, who?: string): BadRequestException {
    if (who) return new BadRequestException(`${who}: ${message}`);
    return new BadRequestException(message.charAt(0).toUpperCase() + message.slice(1));
  }

  private assertSkills(skills: string[] | undefined, who?: string): void {
    if (!Array.isArray(skills) || skills.length === 0) {
      throw this.answerError('please select at least one skill.', who);
    }
    if (skills.length > MAX_SKILLS) {
      throw this.answerError(`please select at most ${MAX_SKILLS} skills.`, who);
    }
    const invalid = skills.filter((s) => !SKILL_OPTIONS.includes(s));
    if (invalid.length > 0) {
      throw this.answerError(`invalid skill selection: ${invalid.join(', ')}.`, who);
    }
  }

  private assertShortlistingAnswers(answers: ShortlistingAnswers, who?: string): void {
    if (!answers.years_experience || !YEARS_EXPERIENCE_OPTIONS.includes(answers.years_experience)) {
      throw this.answerError('please select a valid years of experience option.', who);
    }
    if (!answers.prior_hackathons || !PRIOR_HACKATHON_OPTIONS.includes(answers.prior_hackathons)) {
      throw this.answerError('please select a valid number of previous hackathons.', who);
    }
    if (answers.ai_experience && !AI_EXPERIENCE_OPTIONS.includes(answers.ai_experience)) {
      throw this.answerError('please select a valid AI experience option.', who);
    }
    if (!answers.best_project || !answers.best_project.trim()) {
      throw this.answerError('please tell us about your best project so far.', who);
    }
    if (answers.best_project.length > MAX_BEST_PROJECT_LENGTH) {
      throw this.answerError(
        `your best project answer must be ${MAX_BEST_PROJECT_LENGTH} characters or fewer.`,
        who,
      );
    }
    if (!answers.motivation || !answers.motivation.trim()) {
      throw this.answerError('please describe how you will contribute to the Hackathon.', who);
    }
    if (answers.motivation.length > MAX_MOTIVATION_LENGTH) {
      throw this.answerError(
        `your motivation must be ${MAX_MOTIVATION_LENGTH} characters or fewer.`,
        who,
      );
    }
  }

  /**
   * Public link from shortlisted email: records spot acknowledgement only.
   */
  async acknowledgeSpot(registrationId: string) {
    const registration = await this.registrationRepo.findOne({
      where: { id: registrationId },
      relations: ['event'],
    });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status !== 'shortlisted') {
      if (registration.acknowledged) {
        throw new BadRequestException('ALREADY_ACKNOWLEDGED');
      }
      throw new BadRequestException('Acknowledgement is only available after you have been shortlisted.');
    }

    if (registration.acknowledged) {
      throw new BadRequestException('ALREADY_ACKNOWLEDGED');
    }

    if (registration.acknowledgement_expired) {
      throw new BadRequestException('ACKNOWLEDGEMENT_EXPIRED');
    }

    const event = registration.event;
    const isLocked =
      event.acknowledgement_locked ||
      (event.acknowledgement_deadline && new Date(event.acknowledgement_deadline) < new Date());
    if (isLocked) {
      throw new BadRequestException('ACKNOWLEDGEMENT_EXPIRED');
    }

    registration.acknowledged = true;
    await this.registrationRepo.save(registration);
    return registration;
  }

  async findByEvent(eventId: string) {
    return this.registrationRepo.find({
      where: { event_id: eventId },
      relations: ['attendee'],
      order: { registered_at: 'DESC' },
    });
  }

  async exportCsv(eventId: string, ids?: string[]): Promise<string> {
    let registrations = await this.findByEvent(eventId);
    if (ids && ids.length > 0) {
      const idSet = new Set(ids);
      registrations = registrations.filter(r => idSet.has(r.id));
    }
    const header =
      'ID,Name,Email,Phone,Organization,GitHub,LinkedIn,CNIC,Gender,Best Describes You,Domain,Track,Slot,Role Bucket,Mode,Is Captain,Years Experience,Prior Hackathons,Skills,AI Experience,Portfolio,Best Project,Ambassador,Motivation,Status,Acknowledged,Checked In,Registered At\n';
    const rows = registrations
      .map((r) => {
        const a = r.attendee;
        const registeredAt = r.registered_at
          ? new Date(r.registered_at).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
          : '';
        const skills = (r.skills || []).join('; ');
        return `"${r.id}","${a?.name}","${a?.email}","${a?.phone}","${a?.university_org}","${a?.github || ''}","${a?.linkedin || ''}","${a?.cnic}","${a?.gender || ''}","${a?.best_describes_you || ''}","${r.domain || ''}","${r.track || ''}","${r.slot || ''}","${r.role_bucket || ''}","${r.registration_mode || ''}","${r.is_captain}","${r.years_experience || ''}","${r.prior_hackathons || ''}","${skills.replace(/"/g, '""')}","${r.ai_experience || ''}","${(r.portfolio_url || '').replace(/"/g, '""')}","${(r.best_project || '').replace(/"/g, '""')}","${(r.ambassador || '').replace(/"/g, '""')}","${(r.motivation || '').replace(/"/g, '""')}","${r.status}","${r.acknowledged}","${r.checked_in}","${registeredAt}"`;
      })
      .join('\n');
    return header + rows;
  }
}
