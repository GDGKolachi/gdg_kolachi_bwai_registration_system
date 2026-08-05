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
import { PublicTeamsController, PublicTeamPaymentController } from './public-teams.controller';
import { TeamAssignmentService } from './team-assignment.service';
import { AdminModule } from '../admin/admin.module';
import { EmailModule } from '../email/email.module';

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
    // Team-wide status changes delegate to AdminService.bulkUpdateStatus.
    AdminModule,
    // Deposit requests email the captain.
    EmailModule,
  ],
  controllers: [TeamsController, PublicTeamsController, PublicTeamPaymentController],
  providers: [TeamsService, TeamAssignmentService],
  exports: [TeamsService, TeamAssignmentService],
})
export class TeamsModule {}
