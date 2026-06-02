import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Req, Res, BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { EventsService } from '../events/events.service';
import { RegistrationsService } from '../registrations/registrations.service';
import { ExceptionsService } from '../exceptions/exceptions.service';
import { CreateEventDto } from '../events/dto/create-event.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private eventsService: EventsService,
    private registrationsService: RegistrationsService,
    private exceptionsService: ExceptionsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // Event CRUD
  @Get('events')
  getEvents(@Query('page') page?: string, @Query('limit') limit?: string) {
    if (page || limit) {
      return this.adminService.getEventsPaginated(
        page ? parseInt(page) : 1,
        limit ? parseInt(limit) : 20,
      );
    }
    return this.eventsService.findAll(true);
  }

  @Post('events')
  createEvent(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Patch('events/:id')
  updateEvent(@Param('id') id: string, @Body() dto: Partial<CreateEventDto>) {
    return this.eventsService.update(id, dto);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  // Backwards-compat aliases on /admin/workshops* — same handlers, in case
  // any legacy frontend bundle still calls the old paths during rollout.
  @Get('workshops')
  legacyGetWorkshops(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getEvents(page, limit);
  }

  @Post('workshops')
  legacyCreateWorkshop(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Patch('workshops/:id')
  legacyUpdateWorkshop(@Param('id') id: string, @Body() dto: Partial<CreateEventDto>) {
    return this.eventsService.update(id, dto);
  }

  @Delete('workshops/:id')
  legacyDeleteWorkshop(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  // Registrations with search/filter/pagination
  @Get('registrations')
  getRegistrations(
    @Query('event_id') eventId: string,
    @Query('workshop_id') legacyEventId: string,
    @Query('name') name?: string,
    @Query('email') email?: string,
    @Query('phone') phone?: string,
    @Query('cnic') cnic?: string,
    @Query('status') status?: string,
    @Query('best_describes_you') bestDescribesYou?: string,
    @Query('defines_you_best') definesYouBestLegacy?: string,
    @Query('gender') gender?: string,
    @Query('university_org') universityOrg?: string,
    @Query('domain') domain?: string,
    @Query('role_bucket') roleBucket?: string,
    @Query('ambassador') ambassador?: string,
    @Query('checked_in') checkedIn?: string,
    @Query('acknowledged') acknowledged?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getRegistrations(eventId || legacyEventId, {
      name,
      email,
      phone,
      cnic,
      status,
      best_describes_you: bestDescribesYou || definesYouBestLegacy,
      gender,
      university_org: universityOrg,
      domain,
      role_bucket: roleBucket,
      ambassador,
      checked_in: checkedIn !== undefined && checkedIn !== '' ? checkedIn === 'true' : undefined,
      acknowledged:
        acknowledged !== undefined && acknowledged !== '' ? acknowledged === 'true' : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      sort_by: sortBy || undefined,
      sort_order: sortOrder === 'ASC' ? 'ASC' : sortOrder === 'DESC' ? 'DESC' : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('registrations/ambassadors')
  getAmbassadors(
    @Query('event_id') eventId: string,
    @Query('workshop_id') legacyEventId: string,
  ) {
    return this.adminService.getAmbassadors(eventId || legacyEventId);
  }

  @Get('registrations/export')
  async exportRegistrations(
    @Query('event_id') eventId: string,
    @Query('workshop_id') legacyEventId: string,
    @Res() res: Response,
  ) {
    const id = eventId || legacyEventId;
    const csv = await this.registrationsService.exportCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=registrations-${id}.csv`);
    res.send(csv);
  }

  // Status transitions
  @Patch('registrations/status')
  updateRegistrationsStatus(@Body('ids') ids: string[], @Body('status') status: string) {
    return this.adminService.bulkUpdateStatus(ids, status);
  }

  @Patch('registrations/:id/status')
  updateRegistrationStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateRegistrationStatus(id, status);
  }

  @Patch('registrations/bulk-status')
  bulkUpdateStatus(@Body('ids') ids: string[], @Body('status') status: string) {
    return this.adminService.bulkUpdateStatus(ids, status);
  }

  @Post('registrations/import-status')
  importCsvStatus(@Body('csv') csv: string, @Body('status') status: string) {
    const ids = csv
      .split(/[\r\n,]+/)
      .map((id) => id.replace(/^["'\s]+|["'\s]+$/g, ''))
      .filter((id) => id.length > 0);
    if (ids.length === 0) {
      throw new BadRequestException('No valid IDs found in the uploaded CSV');
    }
    return this.adminService.bulkUpdateStatus(ids, status);
  }

  // Send reminder email (entry pass + custom message) to shortlisted/confirmed registrations
  @Post('registrations/reminder')
  sendReminder(
    @Body('ids') ids: string[],
    @Body('message') message: string,
  ) {
    return this.adminService.sendReminder(ids, message);
  }

  // QR Scan
  @Post('qr-scan')
  scanQrCode(@Body('qr_data') qrData: string) {
    return this.adminService.scanQrCode(qrData);
  }

  @Patch('qr-scan/:id/attend')
  markAttendedFromScan(@Param('id') id: string) {
    return this.adminService.markAttendedFromScan(id);
  }

  // Exceptions
  @Get('exceptions')
  getExceptions() {
    return this.exceptionsService.findAll();
  }

  @Patch('exceptions/:id/approve')
  approveException(@Param('id') id: string, @Req() req: any) {
    return this.exceptionsService.approve(id, req.user.id);
  }

  @Patch('exceptions/:id/reject')
  rejectException(@Param('id') id: string, @Req() req: any) {
    return this.exceptionsService.reject(id, req.user.id);
  }

  // Check-in
  @Get('checkin/search')
  searchCheckin(
    @Query('event_id') eventId: string,
    @Query('workshop_id') legacyEventId: string,
    @Query('q') query: string,
  ) {
    return this.adminService.searchCheckin(eventId || legacyEventId, query);
  }

  @Patch('checkin/:id/toggle')
  toggleCheckin(@Param('id') id: string) {
    return this.adminService.toggleCheckin(id);
  }

  // Users (Admin) CRUD
  @Get('users')
  getUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post('users')
  createUser(@Body() body: { email: string; password: string; name: string }) {
    return this.adminService.createUser(body);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: { email?: string; password?: string; name?: string }) {
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
