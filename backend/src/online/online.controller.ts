/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- untyped request user */
import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ORGANIZER_ROLES } from '../common/enums/admin-role.enum';
import { OnlineService } from './online.service';

// Everyone opens the reminder within the same few minutes, often behind one
// office or campus IP, so the limits are generous. The link is signed, so
// these are about load, not secrecy.
const READ_LIMIT = { default: { ttl: 60000, limit: 600 } };
const CHECKIN_LIMIT = { default: { ttl: 60000, limit: 300 } };

/** Attendee-facing: the personal /join/<token> page. */
@Controller('public/online')
export class OnlinePublicController {
  constructor(private readonly online: OnlineService) {}

  @Get(':token')
  @Throttle(READ_LIMIT)
  get(@Param('token') token: string) {
    return this.online.publicGet(token);
  }

  @Post(':token/checkin')
  @HttpCode(200)
  @Throttle(CHECKIN_LIMIT)
  checkin(@Param('token') token: string) {
    return this.online.selfCheckin(token);
  }
}

@Controller('admin/online')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ORGANIZER_ROLES)
export class OnlineAdminController {
  constructor(private readonly online: OnlineService) {}

  /** "Send reminder now": goes to every seated attendee not yet checked in, even if it already went out. */
  @Post('events/:id/reminder')
  @HttpCode(200)
  sendNow(@Param('id', ParseUUIDPipe) id: string) {
    return this.online.sendReminder(id, { force: true });
  }

  /** One copy to the signed-in admin. */
  @Post('events/:id/reminder/test')
  @HttpCode(200)
  sendTest(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.online.sendTestReminder(id, req.user?.email);
  }
}
