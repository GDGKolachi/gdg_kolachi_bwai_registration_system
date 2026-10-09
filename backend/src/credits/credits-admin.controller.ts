import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CHECKIN_ROLES, ORGANIZER_ROLES } from '../common/enums/admin-role.enum';
import { CreditsService } from './credits.service';
import { SendBulkDto } from './dto';

@Controller('admin/credits')
@UseGuards(JwtAuthGuard, RolesGuard)
// Default: anyone who can check people in. Organizer-only routes opt up below.
@Roles(...CHECKIN_ROLES)
export class CreditsAdminController {
  constructor(private readonly credits: CreditsService) {}

  @Get('events/:eventId/summary')
  summary(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.credits.summary(eventId);
  }

  @Get('events/:eventId/follow-up')
  followUp(@Param('eventId', ParseUUIDPipe) eventId: string, @Query('filter') filter?: string) {
    return this.credits.followUp(eventId, filter);
  }

  @Get('registrations/:id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.credits.getForRegistration(id);
  }

  @Post('registrations/:id/send')
  @HttpCode(200)
  send(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.credits.send(id, req.user.id);
  }

  @Get('registrations/:id/qr')
  qr(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.credits.qr(id, req.user.id);
  }

  @Post('registrations/:id/confirm')
  @HttpCode(200)
  confirm(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.credits.confirm(id, req.user.id);
  }

  @Roles(...ORGANIZER_ROLES)
  @Delete('registrations/:id/confirm')
  unconfirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.credits.unconfirm(id);
  }

  @Roles(...ORGANIZER_ROLES)
  @Post('send-bulk')
  @HttpCode(200)
  sendBulk(@Body() dto: SendBulkDto, @Req() req: any) {
    return this.credits.sendBulk(dto.event_id, dto.registration_ids, req.user.id);
  }
}
