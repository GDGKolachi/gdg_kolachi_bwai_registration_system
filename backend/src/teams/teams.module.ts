import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from '../entities/team.entity';
import { TeamMember } from '../entities/team-member.entity';
import { TeamFormationConfig } from '../entities/team-formation-config.entity';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { Attendee } from '../entities/attendee.entity';
import { RoleCategory } from '../entities/role-category.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TeamAssignmentService } from './team-assignment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Team,
      TeamMember,
      TeamFormationConfig,
      Event,
      Registration,
      Attendee,
      RoleCategory,
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamAssignmentService],
  exports: [TeamsService, TeamAssignmentService],
})
export class TeamsModule {}
