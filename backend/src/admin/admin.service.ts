import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workshop } from '../entities/workshop.entity';
import { Registration } from '../entities/registration.entity';
import { ExceptionRequest } from '../entities/exception-request.entity';
import { Attendee } from '../entities/attendee.entity';
import { Admin } from '../entities/admin.entity';
import { EmailService } from '../email/email.service';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Workshop)
    private workshopRepo: Repository<Workshop>,
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
    @InjectRepository(ExceptionRequest)
    private exceptionRepo: Repository<ExceptionRequest>,
    @InjectRepository(Attendee)
    private attendeeRepo: Repository<Attendee>,
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    private emailService: EmailService,
  ) {}

  async getStats() {
    const workshops = await this.workshopRepo.find();
    const totalRegistrations = await this.registrationRepo.count();
    const pendingExceptions = await this.exceptionRepo.count({ where: { status: 'pending' } });
    const checkedIn = await this.registrationRepo.count({ where: { checked_in: true } });

    const workshopStats: Array<{ id: string; title: string; status: string; maxCapacity: number; registeredCount: number; checkedInCount: number }> = [];
    for (const w of workshops) {
      const registeredCount = await this.registrationRepo.count({ where: { workshop_id: w.id } });
      const checkedInCount = await this.registrationRepo.count({ where: { workshop_id: w.id, checked_in: true } });
      workshopStats.push({
        id: w.id,
        title: w.title,
        status: w.status,
        maxCapacity: w.max_capacity,
        registeredCount,
        checkedInCount,
      });
    }

    return {
      totalWorkshops: workshops.length,
      totalRegistrations,
      pendingExceptions,
      checkedIn,
      workshops: workshopStats,
    };
  }

  async getRegistrations(
    workshopId: string,
    filters: {
      name?: string;
      email?: string;
      phone?: string;
      cnic?: string;
      status?: string;
      defines_you_best?: string;
      gender?: string;
      university_org?: string;
      checked_in?: boolean;
      acknowledged?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const qb = this.registrationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.attendee', 'a')
      .where('r.workshop_id = :workshopId', { workshopId });

    if (filters.name) {
      qb.andWhere('LOWER(a.name) LIKE :name', { name: `%${filters.name.toLowerCase()}%` });
    }

    if (filters.email) {
      qb.andWhere('LOWER(a.email) LIKE :email', { email: `%${filters.email.toLowerCase()}%` });
    }

    if (filters.phone) {
      qb.andWhere('LOWER(a.phone) LIKE :phone', { phone: `%${filters.phone.toLowerCase()}%` });
    }

    if (filters.cnic) {
      qb.andWhere('LOWER(a.cnic) LIKE :cnic', { cnic: `%${filters.cnic.toLowerCase()}%` });
    }

    if (filters.status) {
      qb.andWhere('r.status = :status', { status: filters.status });
    }

    if (filters.defines_you_best) {
      qb.andWhere('a.defines_you_best = :dyb', { dyb: filters.defines_you_best });
    }

    if (filters.gender) {
      qb.andWhere('a.gender = :gender', { gender: filters.gender });
    }

    if (filters.university_org) {
      qb.andWhere('LOWER(a.university_org) LIKE :uorg', {
        uorg: `%${filters.university_org.toLowerCase()}%`,
      });
    }

    if (filters.checked_in !== undefined) {
      qb.andWhere('r.checked_in = :checkedIn', { checkedIn: filters.checked_in });
    }

    if (filters.acknowledged !== undefined) {
      qb.andWhere('r.acknowledged = :acknowledged', { acknowledged: filters.acknowledged });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const total = await qb.getCount();
    const data = await qb
      .orderBy('r.registered_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['shortlisted', 'rejected'],
    shortlisted: ['confirmed', 'rejected'],
    confirmed: ['attended'],
    rejected: [],
    attended: [],
  };

  async updateRegistrationStatus(registrationId: string, newStatus: string) {
    const registration = await this.registrationRepo.findOne({
      where: { id: registrationId },
      relations: ['attendee', 'workshop'],
    });
    if (!registration) throw new NotFoundException('Registration not found');

    const validStatuses = ['pending', 'confirmed', 'shortlisted', 'rejected', 'attended'];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(`Invalid status: "${newStatus}"`);
    }

    const allowed = AdminService.VALID_TRANSITIONS[registration.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${registration.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none (terminal state)'}`,
      );
    }

    registration.status = newStatus;

    if (newStatus === 'shortlisted') {
      registration.acknowledged = false;
      const qrData = JSON.stringify({
        registrationId: registration.id,
        name: registration.attendee.name,
        email: registration.attendee.email,
        phone: registration.attendee.phone,
        cnic: registration.attendee.cnic,
      });
      registration.qr_code_data = qrData;
      await this.registrationRepo.save(registration);

      await this.emailService.sendShortlistedEmail(
        registration.attendee.email,
        registration.attendee.name,
        registration.workshop,
        registration.id,
        qrData,
      );
    } else if (newStatus === 'attended') {
      registration.checked_in = true;
      registration.checked_in_at = new Date();
      await this.registrationRepo.save(registration);
    } else {
      await this.registrationRepo.save(registration);
    }

    return registration;
  }

  async bulkUpdateStatus(registrationIds: string[], newStatus: string) {
    const succeeded: Registration[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of registrationIds) {
      try {
        const reg = await this.updateRegistrationStatus(id, newStatus);
        succeeded.push(reg);
      } catch (err) {
        failed.push({ id, error: err.message });
      }
    }

    return { succeeded, failed };
  }

  async scanQrCode(qrData: string) {
    let parsed: { registrationId?: string };
    try {
      parsed = JSON.parse(qrData);
    } catch {
      throw new BadRequestException('Invalid QR code data');
    }

    if (!parsed.registrationId) {
      throw new BadRequestException('Invalid QR code: missing registration ID');
    }

    const registration = await this.registrationRepo.findOne({
      where: { id: parsed.registrationId },
      relations: ['attendee', 'workshop'],
    });

    if (!registration) throw new NotFoundException('Registration not found');

    return {
      registrationId: registration.id,
      name: registration.attendee.name,
      email: registration.attendee.email,
      phone: registration.attendee.phone,
      cnic: registration.attendee.cnic,
      workshop: registration.workshop.title,
      status: registration.status,
      checkedIn: registration.checked_in,
    };
  }

  async markAttendedFromScan(registrationId: string) {
    const registration = await this.registrationRepo.findOne({
      where: { id: registrationId },
      relations: ['attendee', 'workshop'],
    });
    if (!registration) throw new NotFoundException('Registration not found');

    registration.status = 'attended';
    registration.checked_in = true;
    registration.checked_in_at = new Date();
    return this.registrationRepo.save(registration);
  }

  async searchCheckin(workshopId: string, query: string) {
    const qb = this.registrationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.attendee', 'a')
      .where('r.workshop_id = :workshopId', { workshopId });

    if (query) {
      qb.andWhere('(LOWER(a.name) LIKE :q OR LOWER(a.email) LIKE :q)', {
        q: `%${query.toLowerCase()}%`,
      });
    }

    return qb.orderBy('a.name', 'ASC').getMany();
  }

  async toggleCheckin(registrationId: string) {
    const reg = await this.registrationRepo.findOne({ where: { id: registrationId } });
    if (!reg) throw new Error('Registration not found');
    reg.checked_in = !reg.checked_in;
    reg.checked_in_at = reg.checked_in ? new Date() : null;
    return this.registrationRepo.save(reg);
  }

  // Users (Admin) CRUD
  async getUsers(page = 1, limit = 20) {
    const [data, total] = await this.adminRepo.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: ['id', 'email', 'name', 'created_at'],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createUser(data: { email: string; password: string; name: string }) {
    const existing = await this.adminRepo.findOne({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email already exists');

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.adminRepo.create({
      email: data.email,
      password_hash: passwordHash,
      name: data.name,
    });
    const saved = await this.adminRepo.save(user);
    return { id: saved.id, email: saved.email, name: saved.name, created_at: saved.created_at };
  }

  async updateUser(id: string, data: { email?: string; password?: string; name?: string }) {
    const user = await this.adminRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (data.email) user.email = data.email;
    if (data.name) user.name = data.name;
    if (data.password) user.password_hash = await bcrypt.hash(data.password, 10);

    const saved = await this.adminRepo.save(user);
    return { id: saved.id, email: saved.email, name: saved.name, created_at: saved.created_at };
  }

  async deleteUser(id: string) {
    const result = await this.adminRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('User not found');
    return { deleted: true };
  }

  // Workshops with pagination
  async getWorkshopsPaginated(page = 1, limit = 20) {
    const [workshops, total] = await this.workshopRepo.findAndCount({
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data: Array<any> = [];
    for (const w of workshops) {
      const registeredCount = await this.registrationRepo.count({ where: { workshop_id: w.id } });
      data.push({ ...w, registered_count: registeredCount });
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
