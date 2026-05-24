import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { ExceptionRequest } from '../entities/exception-request.entity';
import { Attendee } from '../entities/attendee.entity';
import { Admin } from '../entities/admin.entity';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
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
    const events = await this.eventRepo.find({ relations: ['event_type'] });
    const totalRegistrations = await this.registrationRepo.count();
    const pendingExceptions = await this.exceptionRepo.count({ where: { status: 'pending' } });
    const checkedIn = await this.registrationRepo.count({ where: { checked_in: true } });

    const eventStats: Array<{ id: string; title: string; event_type?: string; status: string; maxCapacity: number; registeredCount: number; checkedInCount: number }> = [];
    for (const e of events) {
      const registeredCount = await this.registrationRepo.count({ where: { event_id: e.id } });
      const checkedInCount = await this.registrationRepo.count({ where: { event_id: e.id, checked_in: true } });
      eventStats.push({
        id: e.id,
        title: e.title,
        event_type: e.event_type?.name,
        status: e.status,
        maxCapacity: e.max_capacity,
        registeredCount,
        checkedInCount,
      });
    }

    return {
      totalEvents: events.length,
      totalRegistrations,
      pendingExceptions,
      checkedIn,
      events: eventStats,
      // backwards-compat alias for any frontend still using the old key
      totalWorkshops: events.length,
      workshops: eventStats,
    };
  }

  async getRegistrations(
    eventId: string,
    filters: {
      name?: string;
      email?: string;
      phone?: string;
      cnic?: string;
      status?: string;
      best_describes_you?: string;
      gender?: string;
      university_org?: string;
      domain?: string;
      role_bucket?: string;
      ambassador?: string;
      checked_in?: boolean;
      acknowledged?: boolean;
      date_from?: string;
      date_to?: string;
      sort_by?: string;
      sort_order?: 'ASC' | 'DESC';
      page?: number;
      limit?: number;
    },
  ) {
    const qb = this.registrationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.attendee', 'a')
      .where('r.event_id = :eventId', { eventId });

    if (filters.name) qb.andWhere('LOWER(a.name) LIKE :name', { name: `%${filters.name.toLowerCase()}%` });
    if (filters.email) qb.andWhere('LOWER(a.email) LIKE :email', { email: `%${filters.email.toLowerCase()}%` });
    if (filters.phone) qb.andWhere('LOWER(a.phone) LIKE :phone', { phone: `%${filters.phone.toLowerCase()}%` });
    if (filters.cnic) qb.andWhere('LOWER(a.cnic) LIKE :cnic', { cnic: `%${filters.cnic.toLowerCase()}%` });

    if (filters.status) {
      const statuses = filters.status.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) qb.andWhere('r.status = :status', { status: statuses[0] });
      else if (statuses.length > 1) qb.andWhere('r.status IN (:...statuses)', { statuses });
    }

    if (filters.best_describes_you) {
      const profiles = filters.best_describes_you.split(',').map(s => s.trim()).filter(Boolean);
      if (profiles.length === 1) qb.andWhere('a.best_describes_you = :bdy', { bdy: profiles[0] });
      else if (profiles.length > 1) qb.andWhere('a.best_describes_you IN (:...profiles)', { profiles });
    }

    if (filters.gender) {
      const genders = filters.gender.split(',').map(s => s.trim()).filter(Boolean);
      if (genders.length === 1) qb.andWhere('a.gender = :gender', { gender: genders[0] });
      else if (genders.length > 1) qb.andWhere('a.gender IN (:...genders)', { genders });
    }

    if (filters.university_org) {
      qb.andWhere('LOWER(a.university_org) LIKE :uorg', { uorg: `%${filters.university_org.toLowerCase()}%` });
    }

    if (filters.domain) {
      const domains = filters.domain.split(',').map(s => s.trim()).filter(Boolean);
      if (domains.length === 1) qb.andWhere('r.domain = :domain', { domain: domains[0] });
      else if (domains.length > 1) qb.andWhere('r.domain IN (:...domains)', { domains });
    }

    if (filters.role_bucket) {
      const buckets = filters.role_bucket.split(',').map(s => s.trim()).filter(Boolean);
      if (buckets.length === 1) qb.andWhere('r.role_bucket = :bucket', { bucket: buckets[0] });
      else if (buckets.length > 1) qb.andWhere('r.role_bucket IN (:...buckets)', { buckets });
    }

    if (filters.ambassador) {
      const ambassadors = filters.ambassador.split(',').map(s => s.trim()).filter(Boolean);
      if (ambassadors.length === 1) qb.andWhere('r.ambassador = :ambassador', { ambassador: ambassadors[0] });
      else if (ambassadors.length > 1) qb.andWhere('r.ambassador IN (:...ambassadors)', { ambassadors });
    }

    if (filters.checked_in !== undefined) qb.andWhere('r.checked_in = :checkedIn', { checkedIn: filters.checked_in });
    if (filters.acknowledged !== undefined) qb.andWhere('r.acknowledged = :acknowledged', { acknowledged: filters.acknowledged });
    if (filters.date_from) qb.andWhere('r.registered_at >= :dateFrom', { dateFrom: filters.date_from });
    if (filters.date_to) qb.andWhere('r.registered_at <= :dateTo', { dateTo: `${filters.date_to}T23:59:59.999` });

    const sortOrder = filters.sort_order === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = filters.sort_by === 'registered_at' ? 'r.registered_at' : 'r.registered_at';

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const total = await qb.getCount();
    const data = await qb
      .orderBy(sortBy, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAmbassadors(eventId: string): Promise<string[]> {
    const qb = this.registrationRepo
      .createQueryBuilder('r')
      .select('DISTINCT r.ambassador', 'ambassador')
      .where('r.ambassador IS NOT NULL')
      .andWhere("TRIM(r.ambassador) <> ''");
    if (eventId) qb.andWhere('r.event_id = :eventId', { eventId });
    const rows = await qb.orderBy('r.ambassador', 'ASC').getRawMany();
    return rows.map((row) => row.ambassador).filter(Boolean);
  }

  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['shortlisted', 'rejected'],
    shortlisted: ['confirmed', 'rejected'],
    confirmed: ['attended', 'shortlisted', 'rejected'],
    rejected: ['pending'],
    attended: [],
  };

  async updateRegistrationStatus(registrationId: string, newStatus: string) {
    const registration = await this.registrationRepo.findOne({
      where: { id: registrationId },
      relations: ['attendee', 'event'],
    });
    if (!registration) throw new NotFoundException('Registration not found');

    const validStatuses = ['pending', 'confirmed', 'shortlisted', 'rejected', 'attended'];
    if (!validStatuses.includes(newStatus)) throw new BadRequestException(`Invalid status: "${newStatus}"`);

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
        registration.event,
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

    if (!parsed.registrationId) throw new BadRequestException('Invalid QR code: missing registration ID');

    const registration = await this.registrationRepo.findOne({
      where: { id: parsed.registrationId },
      relations: ['attendee', 'event', 'event.event_type'],
    });

    if (!registration) throw new NotFoundException('Registration not found');

    return {
      registrationId: registration.id,
      name: registration.attendee.name,
      email: registration.attendee.email,
      phone: registration.attendee.phone,
      cnic: registration.attendee.cnic,
      event: registration.event.title,
      event_type: registration.event.event_type?.name,
      event_type_slug: registration.event.event_type?.slug,
      // backwards-compat alias
      workshop: registration.event.title,
      status: registration.status,
      checkedIn: registration.checked_in,
    };
  }

  async markAttendedFromScan(registrationId: string) {
    const registration = await this.registrationRepo.findOne({
      where: { id: registrationId },
      relations: ['attendee', 'event'],
    });
    if (!registration) throw new NotFoundException('Registration not found');

    registration.status = 'attended';
    registration.checked_in = true;
    registration.checked_in_at = new Date();
    return this.registrationRepo.save(registration);
  }

  async searchCheckin(eventId: string, query: string) {
    const qb = this.registrationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.attendee', 'a')
      .where('r.event_id = :eventId', { eventId });

    if (query) {
      qb.andWhere('(LOWER(a.name) LIKE :q OR LOWER(a.email) LIKE :q)', { q: `%${query.toLowerCase()}%` });
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

  async getEventsPaginated(page = 1, limit = 20) {
    const [events, total] = await this.eventRepo.findAndCount({
      relations: ['event_type'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data: Array<any> = [];
    for (const e of events) {
      const registeredCount = await this.registrationRepo.count({ where: { event_id: e.id } });
      data.push({ ...e, registered_count: registeredCount });
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
