import { Controller, Get, Post, Query, Body, Param, Redirect } from '@nestjs/common';
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
  register(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.register(dto);
  }

  @Get(':id/confirm')
  @Redirect()
  async confirmRegistration(@Param('id') id: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      await this.registrationsService.confirmRegistration(id);
      return { url: `${frontendUrl}/registration/confirmation?confirmed=true` };
    } catch {
      return { url: `${frontendUrl}/registration/confirmation?confirmed=false` };
    }
  }
}
