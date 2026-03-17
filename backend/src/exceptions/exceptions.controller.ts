import { Controller, Post, Body } from '@nestjs/common';
import { ExceptionsService } from './exceptions.service';
import { CreateExceptionDto } from './dto/create-exception.dto';

@Controller('exceptions')
export class ExceptionsController {
  constructor(private exceptionsService: ExceptionsService) {}

  @Post()
  submit(@Body() dto: CreateExceptionDto) {
    return this.exceptionsService.submit(dto.email, dto.requested_workshop_id, dto.reason);
  }
}
