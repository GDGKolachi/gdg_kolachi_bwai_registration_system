import { Controller, Get, Post, Query, Body } from '@nestjs/common';
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
}
