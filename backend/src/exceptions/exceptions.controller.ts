import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ExceptionsService } from './exceptions.service';
import { CreateExceptionDto } from './dto/create-exception.dto';

@Controller('exceptions')
export class ExceptionsController {
  constructor(private exceptionsService: ExceptionsService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  submit(@Body() dto: CreateExceptionDto) {
    return this.exceptionsService.submit(dto.email, dto.requested_event_id, dto.reason);
  }
}
