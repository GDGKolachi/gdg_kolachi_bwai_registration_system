import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { ExceptionRequest } from '../entities/exception-request.entity';
import { Attendee } from '../entities/attendee.entity';
import { Admin } from '../entities/admin.entity';
import { EmailService } from '../email/email.service';
import { AdminRole, ADMIN_ROLES } from '../common/enums/admin-role.enum';
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

  /**
   * Soft-deleted registrations are excluded from every count, list, export and
   * check-in surface. `IsNull()` on deleted_at is the filter throughout.
   */
  async softDeleteRegistration(registrationId: string, adminId: string) {
    const registration = await this.registrationRepo.findOne({ where: { id: registrationId } });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.deleted_at) {
      throw new BadRequestException('This registration is already deleted.');
    }
    registration.deleted_at = new Date();
    registration.deleted_by = adminId ?? null;
    await this.registrationRepo.save(registration);
    return { deleted: true };
  }

  async restoreRegistration(registrationId: string) {
    const registration = await this.registrationRepo.findOne({ where: { id: registrationId } });
    if (!registration) throw new NotFoundException('Registration not found');
    if (!registration.deleted_at) {
      throw new BadRequestException('This registration is not deleted.');
    }

    // The seat was released on delete, so it may have been taken since.
    const event = await this.eventRepo.findOne({ where: { id: registration.event_id } });
    if (event) {
      const live = await this.registrationRepo.count({
        where: { event_id: registration.event_id, deleted_at: IsNull() },
      });
      if (live >= event.max_capacity) {
        throw new BadRequestException(
          `Cannot restore — ${event.title} is now at full capacity (${event.max_capacity}).`,
        );
      }
    }

    registration.deleted_at = null;
    registration.deleted_by = null;
    await this.registrationRepo.save(registration);
    return { restored: true };
  }

  async getStats() {
    const events = await this.eventRepo.find({ relations: ['event_type'] });
    const totalRegistrations = await this.registrationRepo.count({ where: { deleted_at: IsNull() } });
    const pendingExceptions = await this.exceptionRepo.count({ where: { status: 'pending' } });
    const checkedIn = await this.registrationRepo.count({
      where: { checked_in: true, deleted_at: IsNull() },
    });

    const eventStats: Array<{ id: string; title: string; event_type?: string; status: string; maxCapacity: number; registeredCount: number; checkedInCount: number }> = [];
    for (const e of events) {
      const registeredCount = await this.registrationRepo.count({
        where: { event_id: e.id, deleted_at: IsNull() },
      });
      const checkedInCount = await this.registrationRepo.count({
        where: { event_id: e.id, checked_in: true, deleted_at: IsNull() },
      });
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
      registration_mode?: string;
      include_deleted?: boolean;
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

    // Soft-deleted rows are hidden unless the admin explicitly asks to see them
    // (the "Show deleted" toggle), which is how they get restored.
    if (!filters.include_deleted) qb.andWhere('r.deleted_at IS NULL');

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

    if (filters.registration_mode) {
      const modes = filters.registration_mode.split(',').map(s => s.trim()).filter(Boolean);
      if (modes.length === 1) qb.andWhere('r.registration_mode = :mode', { mode: modes[0] });
      else if (modes.length > 1) qb.andWhere('r.registration_mode IN (:...modes)', { modes });
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

    // Attach team info for this page in one batched query. Registration has no
    // inverse relation to TeamMember, so this is joined by hand rather than
    // adding a circular entity relation just for the admin viewer column.
    const teamByRegistration = await this.getTeamsForRegistrations(data.map((r) => r.id));

    return {
      data: data.map((r) => ({ ...r, team: teamByRegistration.get(r.id) ?? null })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getTeamsForRegistrations(registrationIds: string[]) {
    const byRegistration = new Map<
      string,
      { id: string; team_number: number; name: string | null; origin: string }
    >();
    if (registrationIds.length === 0) return byRegistration;

    const rows = await this.registrationRepo.manager
      .createQueryBuilder()
      .select([
        'tm.registration_id AS registration_id',
        't.id AS id',
        't.team_number AS team_number',
        't.name AS name',
        't.origin AS origin',
      ])
      .from('team_members', 'tm')
      .innerJoin('teams', 't', 't.id = tm.team_id')
      .where('tm.registration_id IN (:...registrationIds)', { registrationIds })
      .getRawMany();

    for (const row of rows) {
      byRegistration.set(row.registration_id, {
        id: row.id,
        team_number: row.team_number,
        name: row.name,
        origin: row.origin,
      });
    }
    return byRegistration;
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

  async lockAcknowledgements(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    event.acknowledgement_locked = true;
    await this.eventRepo.save(event);

    const result = await this.registrationRepo
      .createQueryBuilder()
      .update()
      .set({ acknowledgement_expired: true })
      .where('event_id = :eventId', { eventId })
      .andWhere('status = :status', { status: 'shortlisted' })
      .andWhere('acknowledged = false')
      .execute();

    return { locked: true, expired_count: result.affected || 0 };
  }

  async unlockAcknowledgements(eventId: string) {
    const event = await this.eventRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    event.acknowledgement_locked = false;
    event.acknowledgement_deadline = null;
    await this.eventRepo.save(event);

    return { locked: false };
  }

  private static readonly VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['shortlisted', 'confirmed', 'rejected'],
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

  // Send a reminder email (entry pass + event instructions + admin's custom message)
  // to a batch of registrations. Only shortlisted/confirmed registrations are eligible —
  // anything else is reported back as a failure so the admin can see what was skipped.
  async sendReminder(registrationIds: string[], customMessage: string) {
    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
      throw new BadRequestException('At least one registration ID is required');
    }

    const ELIGIBLE = new Set(['shortlisted', 'confirmed']);
    const eligible: Array<{
      email: string;
      name: string;
      event: any;
      registrationId: string;
      qrData: string;
    }> = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of registrationIds) {
      const registration = await this.registrationRepo.findOne({
        where: { id },
        relations: ['attendee', 'event'],
      });
      if (!registration) {
        failed.push({ id, error: 'Registration not found' });
        continue;
      }
      if (!ELIGIBLE.has(registration.status)) {
        failed.push({
          id,
          error: `Reminder only available for shortlisted/confirmed (was "${registration.status}")`,
        });
        continue;
      }

      let qrData = registration.qr_code_data;
      if (!qrData && !registration.event.is_online) {
        qrData = JSON.stringify({
          registrationId: registration.id,
          name: registration.attendee.name,
          email: registration.attendee.email,
          phone: registration.attendee.phone,
          cnic: registration.attendee.cnic,
        });
        registration.qr_code_data = qrData;
        await this.registrationRepo.save(registration);
      }

      eligible.push({
        email: registration.attendee.email,
        name: registration.attendee.name,
        event: registration.event,
        registrationId: registration.id,
        qrData: qrData || '',
      });
    }

    if (eligible.length === 0) {
      return { sent: 0, failed };
    }

    const result = await this.emailService.sendReminderBatch(eligible, customMessage);
    return { sent: result.sent, failed };
  }

  /**
   * Tell shortlisted people who never confirmed that their window closed and the
   * spot is gone. Distinct from a rejection: these were selected, and the email
   * has to say so — being dropped for silence reads very differently from not
   * being picked.
   *
   * Eligible are the unacknowledged who are either still shortlisted, or already
   * flagged expired by a previous run. That second case is what makes this
   * re-runnable: with `alsoReject` on, the first run leaves them 'rejected', and
   * without it a failed send could otherwise never be retried.
   *
   * The flags are written before the email goes out — releasing the seat is the
   * admin's decision, not the mail server's — and any address that failed comes
   * back by name so it can be chased.
   */
  async sendAcknowledgementExpired(
    registrationIds: string[],
    opts: { message?: string; alsoReject?: boolean },
  ) {
    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
      throw new BadRequestException('At least one registration ID is required');
    }

    const alsoReject = opts.alsoReject ?? false;
    const recipients: Array<{
      email: string;
      name: string;
      event: any;
      deadline: Date | null;
    }> = [];
    const failed: { id: string; error: string }[] = [];
    let expired = 0;
    let statusUpdated = 0;

    for (const id of registrationIds) {
      const registration = await this.registrationRepo.findOne({
        where: { id },
        relations: ['attendee', 'event'],
      });
      if (!registration) {
        failed.push({ id, error: 'Registration not found' });
        continue;
      }
      if (registration.deleted_at) {
        failed.push({ id, error: 'Registration is deleted' });
        continue;
      }
      if (registration.acknowledged) {
        failed.push({ id, error: 'Already confirmed their spot — skipped' });
        continue;
      }
      if (registration.status !== 'shortlisted' && !registration.acknowledgement_expired) {
        failed.push({
          id,
          error: `Only unconfirmed shortlisted registrations expire (was "${registration.status}")`,
        });
        continue;
      }

      if (!registration.acknowledgement_expired) {
        registration.acknowledgement_expired = true;
        expired++;
      }

      if (alsoReject && registration.status === 'shortlisted') {
        registration.status = 'rejected';
        statusUpdated++;
      }
      await this.registrationRepo.save(registration);

      recipients.push({
        email: registration.attendee.email,
        name: registration.attendee.name,
        event: registration.event,
        deadline: registration.event?.acknowledgement_deadline ?? null,
      });
    }

    if (recipients.length === 0) {
      return { sent: 0, expired, statusUpdated, failed };
    }

    const result = await this.emailService.sendAcknowledgementExpiredBatch(
      recipients,
      opts.message || '',
    );

    for (const email of result.failedEmails || []) {
      failed.push({ id: email, error: 'Marked expired, but the email failed to send' });
    }

    return { sent: result.sent, expired, statusUpdated, failed };
  }

  async sendRejection(registrationIds: string[], alsoReject: boolean, customMessage = '') {
    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
      throw new BadRequestException('At least one registration ID is required');
    }

    const eligible: Array<{ email: string; name: string; event: { title: string } }> = [];
    const failed: { id: string; error: string }[] = [];
    const statusUpdated: string[] = [];

    for (const id of registrationIds) {
      const registration = await this.registrationRepo.findOne({
        where: { id },
        relations: ['attendee', 'event'],
      });
      if (!registration) {
        failed.push({ id, error: 'Registration not found' });
        continue;
      }

      if (alsoReject && registration.status !== 'rejected') {
        const allowed = AdminService.VALID_TRANSITIONS[registration.status] || [];
        if (!allowed.includes('rejected')) {
          failed.push({ id, error: `Cannot reject from "${registration.status}"` });
          continue;
        }
        registration.status = 'rejected';
        await this.registrationRepo.save(registration);
        statusUpdated.push(id);
      }

      eligible.push({
        email: registration.attendee.email,
        name: registration.attendee.name,
        event: { title: registration.event.title },
      });
    }

    if (eligible.length === 0) {
      return { sent: 0, statusUpdated: statusUpdated.length, failed };
    }

    const result = await this.emailService.sendRejectionBatch(eligible, customMessage);
    return { sent: result.sent, statusUpdated: statusUpdated.length, failed };
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
      event_id: registration.event_id,
      event_type: registration.event.event_type?.name,
      event_type_slug: registration.event.event_type?.slug,
      // backwards-compat alias
      workshop: registration.event.title,
      status: registration.status,
      checkedIn: registration.checked_in,
      acknowledged: registration.acknowledged,
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

  async getCheckinStats(eventId: string) {
    const total = await this.registrationRepo.count({
      where: { event_id: eventId, checked_in: true, deleted_at: IsNull() },
    });
    const unacknowledged = await this.registrationRepo.count({
      where: { event_id: eventId, checked_in: true, acknowledged: false, deleted_at: IsNull() },
    });
    return { checkedIn: total, unacknowledgedCheckedIn: unacknowledged };
  }

  async searchCheckin(eventId: string, query: string) {
    const qb = this.registrationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.attendee', 'a')
      .where('r.event_id = :eventId', { eventId })
      .andWhere('r.deleted_at IS NULL');

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
      select: ['id', 'email', 'name', 'role', 'created_at'],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private assertValidRole(role: string): void {
    if (!ADMIN_ROLES.includes(role as AdminRole)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${ADMIN_ROLES.join(', ')}`);
    }
  }

  /**
   * Locking every Super Admin out of the panel is unrecoverable without shell
   * access to the database, so the last one can't be demoted or deleted.
   */
  private async assertNotLastSuperAdmin(user: Admin, action: 'demote' | 'delete'): Promise<void> {
    if (user.role !== AdminRole.SUPER_ADMIN) return;
    const superAdmins = await this.adminRepo.count({ where: { role: AdminRole.SUPER_ADMIN } });
    if (superAdmins <= 1) {
      throw new BadRequestException(
        `Cannot ${action} the last Super Admin — promote another user first.`,
      );
    }
  }

  async createUser(data: { email: string; password: string; name: string; role?: string }) {
    const existing = await this.adminRepo.findOne({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email already exists');

    const role = data.role ?? AdminRole.ORGANIZER;
    this.assertValidRole(role);

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.adminRepo.create({
      email: data.email,
      password_hash: passwordHash,
      name: data.name,
      role,
    });
    const saved = await this.adminRepo.save(user);
    return {
      id: saved.id,
      email: saved.email,
      name: saved.name,
      role: saved.role,
      created_at: saved.created_at,
    };
  }

  async updateUser(
    id: string,
    data: { email?: string; password?: string; name?: string; role?: string },
  ) {
    const user = await this.adminRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (data.role && data.role !== user.role) {
      this.assertValidRole(data.role);
      await this.assertNotLastSuperAdmin(user, 'demote');
      user.role = data.role;
    }
    if (data.email) user.email = data.email;
    if (data.name) user.name = data.name;
    if (data.password) user.password_hash = await bcrypt.hash(data.password, 10);

    const saved = await this.adminRepo.save(user);
    return {
      id: saved.id,
      email: saved.email,
      name: saved.name,
      role: saved.role,
      created_at: saved.created_at,
    };
  }

  async deleteUser(id: string, actingAdminId?: string) {
    if (actingAdminId && actingAdminId === id) {
      throw new BadRequestException('You cannot delete your own account.');
    }
    const user = await this.adminRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertNotLastSuperAdmin(user, 'delete');

    await this.adminRepo.delete(id);
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
      const registeredCount = await this.registrationRepo.count({
        where: { event_id: e.id, deleted_at: IsNull() },
      });
      data.push({ ...e, registered_count: registeredCount });
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
