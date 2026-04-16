import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../entities/registration.entity';
import { Attendee } from '../entities/attendee.entity';
import { Workshop } from '../entities/workshop.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
    @InjectRepository(Attendee)
    private attendeeRepo: Repository<Attendee>,
    @InjectRepository(Workshop)
    private workshopRepo: Repository<Workshop>,
  ) {}

  async checkEmail(email: string) {
    const attendee = await this.attendeeRepo.findOne({ where: { email } });
    if (!attendee) return { registered: false };
    const registration = await this.registrationRepo.findOne({
      where: { attendee_id: attendee.id },
      relations: ['workshop'],
    });
    return {
      registered: !!registration,
      workshop: registration?.workshop?.title,
    };
  }

  async register(dto: CreateRegistrationDto) {
    const workshop = await this.workshopRepo.findOne({ where: { id: dto.workshop_id } });
    if (!workshop) throw new NotFoundException('Workshop not found');
    if (workshop.status !== 'open') throw new BadRequestException('Registration is not open for this workshop');

    const regCount = await this.registrationRepo.count({ where: { workshop_id: dto.workshop_id } });
    if (regCount >= workshop.max_capacity) throw new BadRequestException('Workshop is at full capacity');

    let attendee = await this.attendeeRepo.findOne({ where: { email: dto.email } });
    if (attendee) {
      const existing = await this.registrationRepo.findOne({ where: { attendee_id: attendee.id } });
      if (existing) {
        if (!workshop.allow_exceptions) {
          // Open enrollment: only block duplicate registration for the same workshop
          if (existing.workshop_id === dto.workshop_id) {
            throw new BadRequestException('This email is already registered for this workshop.');
          }
        } else {
          // Normal mode: block any duplicate, must use exception flow
          throw new BadRequestException('This email is already registered for a workshop. Please submit an exception request.');
        }
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
        defines_you_best: dto.defines_you_best,
      });
      attendee = await this.attendeeRepo.save(attendee);
    }

    const registration = this.registrationRepo.create({
      attendee_id: attendee.id,
      workshop_id: dto.workshop_id,
      motivation: dto.motivation,
      status: 'pending',
    });
    const saved = await this.registrationRepo.save(registration);
    return saved;
  }

  /**
   * Public link from shortlisted email: records spot acknowledgement only.
   * Status stays `shortlisted`; sets `acknowledged` to true.
   */
  async acknowledgeSpot(registrationId: string) {
    const registration = await this.registrationRepo.findOne({ where: { id: registrationId } });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status !== 'shortlisted') {
      throw new BadRequestException('Acknowledgement is only available after you have been shortlisted.');
    }
    if (registration.acknowledged) {
      return registration;
    }
    registration.acknowledged = true;
    await this.registrationRepo.save(registration);
    return registration;
  }

  async findByWorkshop(workshopId: string) {
    return this.registrationRepo.find({
      where: { workshop_id: workshopId },
      relations: ['attendee'],
      order: { registered_at: 'DESC' },
    });
  }

  async exportCsv(workshopId: string): Promise<string> {
    const registrations = await this.findByWorkshop(workshopId);
    const header = 'Name,Email,Phone,Organization,GitHub,LinkedIn,CNIC,Gender,Profile,Motivation,Status,Acknowledged,Checked In,Registered At\n';
    const rows = registrations.map(r => {
      const a = r.attendee;
      const registeredAt = r.registered_at
        ? new Date(r.registered_at).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
        : '';
      return `"${a?.name}","${a?.email}","${a?.phone}","${a?.university_org}","${a?.github || ''}","${a?.linkedin || ''}","${a?.cnic}","${a?.gender || ''}","${a?.defines_you_best || ''}","${(r.motivation || '').replace(/"/g, '""')}","${r.status}","${r.acknowledged}","${r.checked_in}","${registeredAt}"`;
    }).join('\n');
    return header + rows;
  }
}
