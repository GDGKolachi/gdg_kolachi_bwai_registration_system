import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
  ) {}

  async onModuleInit() {
    const count = await this.adminRepo.count();
    if (count === 0) {
      const email = process.env.ADMIN_EMAIL || 'admin@gdgkolachi.com';
      const password = process.env.ADMIN_PASSWORD || 'admin123';
      const hash = await bcrypt.hash(password, 10);
      await this.adminRepo.save({
        email,
        password_hash: hash,
        name: 'GDG Admin',
      });
      this.logger.log(`Admin seeded: ${email}`);
    }
  }
}
