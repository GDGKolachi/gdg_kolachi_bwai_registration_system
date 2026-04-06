import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExceptionRequest } from '../entities/exception-request.entity';
import { Attendee } from '../entities/attendee.entity';
import { Workshop } from '../entities/workshop.entity';
import { Registration } from '../entities/registration.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class ExceptionsService {
  constructor(
    @InjectRepository(ExceptionRequest)
    private exceptionRepo: Repository<ExceptionRequest>,
    @InjectRepository(Attendee)
    private attendeeRepo: Repository<Attendee>,
    @InjectRepository(Workshop)
    private workshopRepo: Repository<Workshop>,
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
    private emailService: EmailService,
  ) {}

  async submit(email: string, requestedWorkshopId: string, reason: string) {
    const attendee = await this.attendeeRepo.findOne({ where: { email } });
    if (!attendee) throw new BadRequestException('No registration found for this email');

    const workshop = await this.workshopRepo.findOne({ where: { id: requestedWorkshopId } });
    if (!workshop) throw new NotFoundException('Workshop not found');

    const existingException = await this.exceptionRepo.findOne({
      where: { attendee_id: attendee.id, requested_workshop_id: requestedWorkshopId, status: 'pending' },
    });
    if (existingException) throw new BadRequestException('You already have a pending exception request for this workshop');

    const exception = this.exceptionRepo.create({
      attendee_id: attendee.id,
      requested_workshop_id: requestedWorkshopId,
      reason,
    });
    const saved = await this.exceptionRepo.save(exception);

    return saved;
  }

  async findAll() {
    const exceptions = await this.exceptionRepo.find({
      relations: ['attendee', 'requested_workshop'],
      order: { created_at: 'DESC' },
    });

    // Enrich each exception with the attendee's current workshop
    const enriched = await Promise.all(
      exceptions.map(async (ex) => {
        const currentReg = await this.registrationRepo.findOne({
          where: { attendee_id: ex.attendee_id },
          relations: ['workshop'],
          order: { registered_at: 'DESC' },
        });
        return {
          ...ex,
          current_workshop: currentReg?.workshop ?? null,
        };
      }),
    );

    return enriched;
  }

  async approve(id: string, adminId: string) {
    const exception = await this.exceptionRepo.findOne({
      where: { id },
      relations: ['attendee', 'requested_workshop'],
    });
    if (!exception) throw new NotFoundException('Exception request not found');
    if (exception.status !== 'pending') throw new BadRequestException('Already processed');

    exception.status = 'approved';
    exception.reviewed_by = adminId;
    exception.reviewed_at = new Date();
    await this.exceptionRepo.save(exception);

    const registration = this.registrationRepo.create({
      attendee_id: exception.attendee_id,
      workshop_id: exception.requested_workshop_id,
      motivation: `Exception approved: ${exception.reason}`,
      status: 'confirmed',
    });
    const savedReg = await this.registrationRepo.save(registration);

    return exception;
  }

  async reject(id: string, adminId: string) {
    const exception = await this.exceptionRepo.findOne({
      where: { id },
      relations: ['attendee', 'requested_workshop'],
    });
    if (!exception) throw new NotFoundException('Exception request not found');
    if (exception.status !== 'pending') throw new BadRequestException('Already processed');

    exception.status = 'rejected';
    exception.reviewed_by = adminId;
    exception.reviewed_at = new Date();
    await this.exceptionRepo.save(exception);

    return exception;
  }
}
