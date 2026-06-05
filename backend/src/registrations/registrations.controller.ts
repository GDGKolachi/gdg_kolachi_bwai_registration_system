import { Controller, Get, Post, Query, Body, Param, Redirect } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Controller('registrations')
export class RegistrationsController {
  constructor(private registrationsService: RegistrationsService) {}

  @Get('check-email')
  checkEmail(@Query('email') email: string) {
    return this.registrationsService.checkEmail(email);
  }

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  register(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.register(dto);
  }

  @Get(':id/acknowledge')
  @Redirect()
  async acknowledgeSpot(@Param('id') id: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      await this.registrationsService.acknowledgeSpot(id);
      return { url: `${frontendUrl}/registration/confirmation?acknowledged=true` };
    } catch (err) {
      if (err?.message === 'ALREADY_ACKNOWLEDGED') {
        return { url: `${frontendUrl}/registration/confirmation?acknowledged=already` };
      }
      if (err?.message === 'ACKNOWLEDGEMENT_EXPIRED') {
        return { url: `${frontendUrl}/registration/confirmation?acknowledged=expired` };
      }
      return { url: `${frontendUrl}/registration/confirmation?acknowledged=false` };
    }
  }
}
