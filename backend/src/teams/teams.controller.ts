import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamsService } from './teams.service';
import { TeamAssignmentService } from './team-assignment.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(
    private teamsService: TeamsService,
    private assignment: TeamAssignmentService,
  ) {}

  @Get('events/:eventId/teams')
  list(@Param('eventId') eventId: string) {
    return this.teamsService.listForEvent(eventId);
  }

  @Get('events/:eventId/team-formation-config')
  getConfig(@Param('eventId') eventId: string) {
    return this.teamsService.getConfig(eventId);
  }

  @Patch('events/:eventId/team-formation-config')
  updateConfig(@Param('eventId') eventId: string, @Body() body: any) {
    return this.teamsService.updateConfig(eventId, body);
  }

  @Post('events/:eventId/teams/optimize')
  optimize(@Param('eventId') eventId: string) {
    return this.teamsService.optimize(eventId);
  }

  @Post('events/:eventId/teams/lock')
  lock(@Param('eventId') eventId: string) {
    return this.teamsService.lock(eventId);
  }

  // One team with its full roster — powers the team view in the record drawer.
  @Get('teams/:teamId')
  getTeam(@Param('teamId') teamId: string) {
    return this.teamsService.getTeamDetail(teamId);
  }

  @Post('teams/:teamId/unlock')
  unlockTeam(@Param('teamId') teamId: string) {
    return this.teamsService.unlockTeam(teamId);
  }

  // ── Deposit confirmation ───────────────────────────────────────────────

  // Emails each team's captain (members CC'd) and starts the 24-hour window.
  // Re-requesting resets the window, which is how a deadline gets extended.
  @Post('teams/request-payment')
  requestPayment(@Body('team_ids') teamIds: string[]) {
    return this.teamsService.requestTeamPayment(Array.isArray(teamIds) ? teamIds : [teamIds]);
  }

  @Post('teams/:teamId/payment/confirm')
  confirmPayment(@Param('teamId') teamId: string, @Req() req: any) {
    return this.teamsService.confirmTeamPayment(teamId, req.user.id);
  }

  @Post('teams/:teamId/payment/reject')
  rejectPayment(@Param('teamId') teamId: string, @Body('reason') reason: string) {
    return this.teamsService.rejectTeamPayment(teamId, reason);
  }

  // Atomic team shortlisting: applies one status to every member of the team.
  @Patch('teams/:teamId/status')
  updateTeamStatus(@Param('teamId') teamId: string, @Body('status') status: string) {
    return this.teamsService.updateTeamStatus(teamId, status);
  }

  @Patch('teams/:teamId/members/:registrationId/move')
  moveMember(
    @Param('teamId') teamId: string,
    @Param('registrationId') registrationId: string,
    @Req() req: any,
  ) {
    return this.teamsService.moveMember(teamId, registrationId, req.user.id);
  }

  @Patch('teams/swap-members')
  swapMembers(
    @Body() body: { registrationIdA: string; registrationIdB: string },
    @Req() req: any,
  ) {
    return this.teamsService.swapMembers(body.registrationIdA, body.registrationIdB, req.user.id);
  }

  // Hackathon check-in: marks the registration checked in AND runs the
  // team-assignment engine, returning the assigned team.
  @Post('hackathon-checkin/:registrationId')
  async hackathonCheckin(@Param('registrationId') registrationId: string, @Req() req: any) {
    return this.assignment.assignAtCheckin(registrationId, req.user.id);
  }

  // Removes the registration's team membership and un-checks them in.
  @Post('hackathon-checkin/:registrationId/unassign')
  async hackathonUnassign(@Param('registrationId') registrationId: string) {
    return this.assignment.unassignMember(registrationId);
  }
}
