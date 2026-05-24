import { Controller, Get, Param, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('events')
export class PublicTeamsController {
  constructor(private teamsService: TeamsService) {}

  // Public: an attendee looks up their hackathon team by email + name.
  @Get(':eventId/team-lookup')
  lookup(
    @Param('eventId') eventId: string,
    @Query('email') email: string,
    @Query('name') name: string,
  ) {
    return this.teamsService.publicTeamLookup(eventId, email, name);
  }
}
