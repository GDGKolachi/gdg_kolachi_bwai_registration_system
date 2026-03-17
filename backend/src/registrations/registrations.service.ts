import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration } from '../entities/registration.entity';
import { Attendee } from '../entities/attendee.entity';
import { Workshop } from '../entities/workshop.entity';
import { EmailService } from '../email/email.service';
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
    private emailService: EmailService,
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
      if (existing) throw new BadRequestException('This email is already registered for a workshop. Please submit an exception request.');
    }

    if (!attendee) {
      attendee = this.attendeeRepo.create({
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        university_org: dto.university_org,
        github_linkedin: dto.github_linkedin,
        cnic: dto.cnic,
      });
      attendee = await this.attendeeRepo.save(attendee);
    }

    const registration = this.registrationRepo.create({
      attendee_id: attendee.id,
      workshop_id: dto.workshop_id,
      motivation: dto.motivation,
      status: 'confirmed',
    });
    const saved = await this.registrationRepo.save(registration);

    await this.emailService.sendRegistrationConfirmation(
      attendee.email, attendee.name, workshop, saved.id,
    );

    return saved;
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
    const header = 'Name,Email,Phone,Organization,GitHub/LinkedIn,CNIC,Motivation,Status,Checked In,Registered At\n';
    const rows = registrations.map(r => {
      const a = r.attendee;
      return `"${a?.name}","${a?.email}","${a?.phone}","${a?.university_org}","${a?.github_linkedin || ''}","${a?.cnic}","${r.motivation}","${r.status}","${r.checked_in}","${r.registered_at}"`;
    }).join('\n');
    return header + rows;
  }
}
