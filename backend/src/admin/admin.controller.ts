import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { WorkshopsService } from '../workshops/workshops.service';
import { RegistrationsService } from '../registrations/registrations.service';
import { ExceptionsService } from '../exceptions/exceptions.service';
import { CreateWorkshopDto } from '../workshops/dto/create-workshop.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private workshopsService: WorkshopsService,
    private registrationsService: RegistrationsService,
    private exceptionsService: ExceptionsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // Workshop CRUD
  @Get('workshops')
  getWorkshops() {
    return this.workshopsService.findAll();
  }

  @Post('workshops')
  createWorkshop(@Body() dto: CreateWorkshopDto) {
    return this.workshopsService.create(dto);
  }

  @Patch('workshops/:id')
  updateWorkshop(@Param('id') id: string, @Body() dto: Partial<CreateWorkshopDto>) {
    return this.workshopsService.update(id, dto);
  }

  @Delete('workshops/:id')
  deleteWorkshop(@Param('id') id: string) {
    return this.workshopsService.remove(id);
  }

  // Registrations
  @Get('registrations')
  getRegistrations(@Query('workshop_id') workshopId: string) {
    return this.registrationsService.findByWorkshop(workshopId);
  }

  @Get('registrations/export')
  async exportRegistrations(@Query('workshop_id') workshopId: string, @Res() res: Response) {
    const csv = await this.registrationsService.exportCsv(workshopId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=registrations-${workshopId}.csv`);
    res.send(csv);
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
  searchCheckin(@Query('workshop_id') workshopId: string, @Query('q') query: string) {
    return this.adminService.searchCheckin(workshopId, query);
  }

  @Patch('checkin/:id/toggle')
  toggleCheckin(@Param('id') id: string) {
    return this.adminService.toggleCheckin(id);
  }
}
