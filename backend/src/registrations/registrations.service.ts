import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Registration } from '../entities/registration.entity';
import { Attendee } from '../entities/attendee.entity';
import { Event } from '../entities/event.entity';
import { RoleCategory } from '../entities/role-category.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';

const HACKATHON_DOMAINS = [
  'Service & Software Solutions',
  'Fintech & Digital Economy',
  'Healthcare, EdTech & Skill Development',
  'Logistics, Retail & E-commerce',
  'Infrastructure, Smart City & Government Systems',
  'Water, Energy & Waste Management',
  'Social Impact, Accessibility & Inclusion',
  'Environment & Climate Change Solutions',
  'Cybersecurity & Digital Safety',
  'AI, Automation & Emerging Technologies',
  'SME & Startup Enablement',
];

const HACKATHON_ROLES = [
  'Student',
  'Web Developer',
  'Mobile App Developer',
  'Software Developer',
  'Full Stack Developer',
  'Game Developer',
  'Other Developer',
  'UI/UX Designer',
  'Product Designer',
  'Game Designer',
  'Other Designer',
  'SQA Engineer/Tester',
  'Product and Marketing',
  'Freelancer',
  'Others',
];

const DEFAULT_ROLES = [
  'Student',
  'Young Professional',
  'Intermediate Expert',
  'Senior Expert',
  'Freelancer',
  'Other',
];

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
      if (!dto.motivation || !dto.motivation.trim()) {
        throw new BadRequestException('Please describe how you will contribute to the Hackathon.');
      }
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

    // Per-event-type duplicate rule: an attendee may hold one registration per event type.
    let attendee = await this.attendeeRepo.findOne({ where: { email: dto.email } });
    if (attendee) {
      const sameTypeExisting = await this.registrationRepo
        .createQueryBuilder('r')
        .leftJoin('r.event', 'e')
        .where('r.attendee_id = :aid', { aid: attendee.id })
        .andWhere('e.event_type_id = :etid', { etid: event.event_type_id })
        .getOne();
      if (sameTypeExisting) {
        if (event.allow_exceptions === false) {
          throw new BadRequestException(
            `This email is already registered for a ${event.event_type?.name} event.`,
          );
        }
        throw new BadRequestException(
          `This email is already registered for a ${event.event_type?.name} event. Please submit an exception request to change events.`,
        );
      }
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
    });
    const saved = await this.registrationRepo.save(registration);
    return saved;
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

  async exportCsv(eventId: string): Promise<string> {
    const registrations = await this.findByEvent(eventId);
    const header =
      'ID,Name,Email,Phone,Organization,GitHub,LinkedIn,CNIC,Gender,Best Describes You,Domain,Track,Slot,Role Bucket,Ambassador,Motivation,Status,Acknowledged,Checked In,Registered At\n';
    const rows = registrations
      .map((r) => {
        const a = r.attendee;
        const registeredAt = r.registered_at
          ? new Date(r.registered_at).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
          : '';
        return `"${r.id}","${a?.name}","${a?.email}","${a?.phone}","${a?.university_org}","${a?.github || ''}","${a?.linkedin || ''}","${a?.cnic}","${a?.gender || ''}","${a?.best_describes_you || ''}","${r.domain || ''}","${r.track || ''}","${r.slot || ''}","${r.role_bucket || ''}","${(r.ambassador || '').replace(/"/g, '""')}","${(r.motivation || '').replace(/"/g, '""')}","${r.status}","${r.acknowledged}","${r.checked_in}","${registeredAt}"`;
      })
      .join('\n');
    return header + rows;
  }
}
