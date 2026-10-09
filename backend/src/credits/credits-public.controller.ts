import { Body, Controller, Get, HttpCode, Param, Post, Redirect } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreditsService } from './credits.service';
import { SelfResendDto } from './dto';

// Limits are per IP and deliberately generous: a whole venue shares one public
// IP on its Wi-Fi, so tight per-IP limits would lock attendees out at the exact
// moment they all open the email. Tokens are unguessable, so these limits are
// about load, not secrecy; the resend endpoint is additionally protected by a
// per-row cooldown.
const READ_LIMIT = { default: { ttl: 60000, limit: 600 } };
const REDEEM_LIMIT = { default: { ttl: 60000, limit: 300 } };
const RESEND_LIMIT = { default: { ttl: 60000, limit: 30 } };

@Controller('public/credits')
export class CreditsPublicController {
  constructor(private readonly credits: CreditsService) {}

  @Post('resend')
  @HttpCode(200)
  @Throttle(RESEND_LIMIT)
  resend(@Body() dto: SelfResendDto) {
    return this.credits.selfResend(dto.email, dto.event_id);
  }

  @Get(':token')
  @Throttle(READ_LIMIT)
  get(@Param('token') token: string) {
    return this.credits.publicGet(token);
  }

  @Post(':token/redeem')
  @HttpCode(200)
  @Throttle(REDEEM_LIMIT)
  redeem(@Param('token') token: string) {
    return this.credits.redeem(token);
  }

  @Get(':token/claim')
  @Redirect(undefined, 302)
  @Throttle(READ_LIMIT)
  async claim(@Param('token') token: string) {
    return { url: await this.credits.trackClick(token, 'claim') };
  }

  @Get(':token/video')
  @Redirect(undefined, 302)
  @Throttle(READ_LIMIT)
  async video(@Param('token') token: string) {
    return { url: await this.credits.trackClick(token, 'video') };
  }
}
