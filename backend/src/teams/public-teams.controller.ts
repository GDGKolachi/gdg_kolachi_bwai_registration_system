import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
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

/**
 * The deposit page a captain reaches from the request email.
 *
 * Authorised by knowing the team's UUID, which is the same bearer-token-in-a-URL
 * shape the existing acknowledgement link already uses. The payload deliberately
 * carries no member contact details, so a forwarded link exposes only the team's
 * own deposit state — never its roster.
 */
@Controller('public/teams')
export class PublicTeamPaymentController {
  constructor(private teamsService: TeamsService) {}

  @Get(':teamId/deposit')
  view(@Param('teamId') teamId: string) {
    return this.teamsService.getPublicPaymentView(teamId);
  }

  @Post(':teamId/deposit')
  submit(
    @Param('teamId') teamId: string,
    @Body() body: { reference: string; sender_name: string; note?: string },
  ) {
    return this.teamsService.submitTeamPayment(teamId, body);
  }
}
