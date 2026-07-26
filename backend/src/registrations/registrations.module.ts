import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from '../entities/registration.entity';
import { Attendee } from '../entities/attendee.entity';
import { Event } from '../entities/event.entity';
import { RoleCategory } from '../entities/role-category.entity';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamFormationConfig } from '../entities/team-formation-config.entity';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Registration,
      Attendee,
      Event,
      RoleCategory,
      Team,
      TeamMember,
      TeamFormationConfig,
    ]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
