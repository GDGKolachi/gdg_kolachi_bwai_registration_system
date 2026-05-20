import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventTypesService } from './event-types.service';

@Controller()
export class EventTypesController {
  constructor(private service: EventTypesService) {}

  // Public: used by the registration form & admin event-create selector
  @Get('event-types')
  list(@Query('active') active?: string) {
    return this.service.findAll(active === 'true');
  }

  // Admin CRUD
  @UseGuards(JwtAuthGuard)
  @Get('admin/event-types')
  adminList() {
    return this.service.findAll(false);
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/event-types')
  create(@Body() body: { name: string; slug: string; description?: string; is_active?: boolean }) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('admin/event-types/:id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; description?: string; is_active?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('admin/event-types/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
