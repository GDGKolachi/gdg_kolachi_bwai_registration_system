import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
  ) {}

  async findAll(includeDisabled = false) {
    const where = includeDisabled ? {} : { status: Not('disabled') };
    const events = await this.eventRepo.find({
      where,
      relations: ['event_type'],
      order: { created_at: 'DESC' },
    });
    const result: Array<Event & { registered_count: number }> = [];
    for (const e of events) {
      const registeredCount = await this.registrationRepo.count({ where: { event_id: e.id } });
      result.push({ ...e, registered_count: registeredCount });
    }
    return result;
  }

  async findOne(id: string) {
    const event = await this.eventRepo.findOne({ where: { id }, relations: ['event_type'] });
    if (!event) throw new NotFoundException('Event not found');
    const registeredCount = await this.registrationRepo.count({ where: { event_id: id } });
    return { ...event, registered_count: registeredCount };
  }

  async create(data: Partial<Event>) {
    const event = this.eventRepo.create(data);
    return this.eventRepo.save(event);
  }

  async update(id: string, data: Partial<Event>) {
    if (data.max_capacity !== undefined) {
      const registeredCount = await this.registrationRepo.count({ where: { event_id: id } });
      if (data.max_capacity < registeredCount) {
        throw new BadRequestException(
          `Cannot set capacity to ${data.max_capacity}. There are already ${registeredCount} registrations.`,
        );
      }
    }
    await this.eventRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    const result = await this.eventRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Event not found');
    return { deleted: true };
  }
}
