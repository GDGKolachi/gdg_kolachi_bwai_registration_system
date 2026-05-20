import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from '../entities/event-type.entity';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class EventTypesService {
  constructor(
    @InjectRepository(EventType)
    private repo: Repository<EventType>,
  ) {}

  findAll(activeOnly = false) {
    const where = activeOnly ? { is_active: true } : {};
    return this.repo.find({ where, order: { created_at: 'ASC' } });
  }

  async findOne(id: string) {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Event type not found');
    return found;
  }

  async findBySlug(slug: string) {
    return this.repo.findOne({ where: { slug } });
  }

  async create(data: Partial<EventType>) {
    if (!data.name || !data.slug) throw new BadRequestException('name and slug are required');
    if (!SLUG_RE.test(data.slug)) throw new BadRequestException('slug must be lowercase alphanumeric with hyphens');
    const existing = await this.repo.findOne({ where: [{ name: data.name }, { slug: data.slug }] });
    if (existing) throw new BadRequestException('Event type with that name or slug already exists');
    const created = this.repo.create(data);
    return this.repo.save(created);
  }

  async update(id: string, data: Partial<EventType>) {
    const found = await this.findOne(id);
    if (data.slug && !SLUG_RE.test(data.slug)) {
      throw new BadRequestException('slug must be lowercase alphanumeric with hyphens');
    }
    Object.assign(found, data);
    return this.repo.save(found);
  }

  async remove(id: string) {
    const found = await this.findOne(id);
    found.is_active = false;
    return this.repo.save(found);
  }
}
