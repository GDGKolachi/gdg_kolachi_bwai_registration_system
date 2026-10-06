import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ORGANIZER_ROLES } from '../common/enums/admin-role.enum';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ORGANIZER_ROLES)
  @Get('admin/event-types')
  adminList() {
    return this.service.findAll(false);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ORGANIZER_ROLES)
  @Post('admin/event-types')
  create(@Body() body: { name: string; slug: string; description?: string; is_active?: boolean }) {
    return this.service.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ORGANIZER_ROLES)
  @Patch('admin/event-types/:id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; description?: string; is_active?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ORGANIZER_ROLES)
  @Delete('admin/event-types/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
