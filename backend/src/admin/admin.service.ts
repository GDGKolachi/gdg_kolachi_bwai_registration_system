import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workshop } from '../entities/workshop.entity';
import { Registration } from '../entities/registration.entity';
import { ExceptionRequest } from '../entities/exception-request.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Workshop)
    private workshopRepo: Repository<Workshop>,
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
    @InjectRepository(ExceptionRequest)
    private exceptionRepo: Repository<ExceptionRequest>,
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
}
