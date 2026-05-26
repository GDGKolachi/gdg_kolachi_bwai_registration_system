import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Admin } from '../entities/admin.entity';
import { EventType } from '../entities/event-type.entity';
import { RoleCategory } from '../entities/role-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Admin, EventType, RoleCategory])],
  providers: [SeedService],
})
export class SeedModule {}
