import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entities/admin.entity';
import { EventType } from '../entities/event-type.entity';
import { RoleCategory } from '../entities/role-category.entity';
import { SKILL_BUCKETS } from '../common/constants/hackathon.constants';
import { AdminRole } from '../common/enums/admin-role.enum';

const EVENT_TYPES = [
  { name: 'Workshop', slug: 'workshop', description: 'Hands-on learning session' },
  { name: 'Talks', slug: 'talks', description: 'Speaker-led talk session' },
  { name: 'Community Lounge', slug: 'community-lounge', description: 'Casual track + slot networking session' },
  { name: 'Hackathon', slug: 'hackathon', description: 'Team-based building competition' },
];

// Hackathons now key team formation off the attendee's primary skill, so those
// names need bucket rows too. The legacy role names below stay seeded so
// registrations taken before the switch still resolve.
const SKILL_CATEGORIES: Array<{ role_name: string; bucket: string }> = Object.entries(
  SKILL_BUCKETS,
).map(([role_name, bucket]) => ({ role_name, bucket }));

const ROLE_CATEGORIES: Array<{ role_name: string; bucket: string }> = [
  { role_name: 'Student', bucket: 'student' },
  { role_name: 'Web Developer', bucket: 'developer' },
  { role_name: 'Mobile App Developer', bucket: 'developer' },
  { role_name: 'Software Developer', bucket: 'developer' },
  { role_name: 'Full Stack Developer', bucket: 'developer' },
  { role_name: 'Game Developer', bucket: 'developer' },
  { role_name: 'Other Developer', bucket: 'developer' },
  { role_name: 'UI/UX Designer', bucket: 'designer' },
  { role_name: 'Product Designer', bucket: 'product_designer' },
  { role_name: 'Game Designer', bucket: 'designer' },
  { role_name: 'Other Designer', bucket: 'designer' },
  { role_name: 'SQA Engineer/Tester', bucket: 'qa' },
  { role_name: 'Product and Marketing', bucket: 'sales' },
  { role_name: 'Freelancer', bucket: 'freelancer' },
  { role_name: 'Others', bucket: 'other' },
];

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    @InjectRepository(EventType)
    private eventTypeRepo: Repository<EventType>,
    @InjectRepository(RoleCategory)
    private roleCategoryRepo: Repository<RoleCategory>,
  ) {}

  async onModuleInit() {
    const adminCount = await this.adminRepo.count();
    if (adminCount === 0) {
      const email = process.env.ADMIN_EMAIL || 'admin@gdgkolachi.com';
      const password = process.env.ADMIN_PASSWORD || 'admin123';
      const hash = await bcrypt.hash(password, 10);
      await this.adminRepo.save({
        email,
        password_hash: hash,
        name: 'GDG Admin',
        role: AdminRole.SUPER_ADMIN,
      });
      this.logger.log(`Admin seeded: ${email}`);
    }

    for (const t of EVENT_TYPES) {
      const existing = await this.eventTypeRepo.findOne({ where: { slug: t.slug } });
      if (!existing) {
        await this.eventTypeRepo.save(this.eventTypeRepo.create(t));
        this.logger.log(`Event type seeded: ${t.slug}`);
      }
    }

    for (const r of [...ROLE_CATEGORIES, ...SKILL_CATEGORIES]) {
      const existing = await this.roleCategoryRepo.findOne({ where: { role_name: r.role_name } });
      if (!existing) {
        await this.roleCategoryRepo.save(this.roleCategoryRepo.create(r));
      }
    }
  }
}
