import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workshop } from '../entities/workshop.entity';
import { Registration } from '../entities/registration.entity';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private workshopRepo: Repository<Workshop>,
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
  ) {}

  async findAll() {
    const workshops = await this.workshopRepo.find({ order: { created_at: 'DESC' } });
    const result: Array<Workshop & { registered_count: number }> = [];
    for (const w of workshops) {
      const registeredCount = await this.registrationRepo.count({ where: { workshop_id: w.id } });
      result.push({ ...w, registered_count: registeredCount });
    }
    return result;
  }

  async findOne(id: string) {
    const workshop = await this.workshopRepo.findOne({ where: { id } });
    if (!workshop) throw new NotFoundException('Workshop not found');
    const registeredCount = await this.registrationRepo.count({ where: { workshop_id: id } });
    return { ...workshop, registered_count: registeredCount };
  }

  async create(data: Partial<Workshop>) {
    const workshop = this.workshopRepo.create(data);
    return this.workshopRepo.save(workshop);
  }

  async update(id: string, data: Partial<Workshop>) {
    await this.workshopRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    const result = await this.workshopRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Workshop not found');
    return { deleted: true };
  }
}
