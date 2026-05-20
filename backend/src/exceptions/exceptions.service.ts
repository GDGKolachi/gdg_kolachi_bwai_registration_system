import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExceptionRequest } from '../entities/exception-request.entity';
import { Attendee } from '../entities/attendee.entity';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class ExceptionsService {
  constructor(
    @InjectRepository(ExceptionRequest)
    private exceptionRepo: Repository<ExceptionRequest>,
    @InjectRepository(Attendee)
    private attendeeRepo: Repository<Attendee>,
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
    @InjectRepository(Registration)
    private registrationRepo: Repository<Registration>,
    private emailService: EmailService,
  ) {}

  async submit(email: string, requestedEventId: string, reason: string) {
    const attendee = await this.attendeeRepo.findOne({ where: { email } });
    if (!attendee) throw new BadRequestException('No registration found for this email');

    const event = await this.eventRepo.findOne({ where: { id: requestedEventId } });
    if (!event) throw new NotFoundException('Event not found');

    if (event.allow_exceptions === false) {
      throw new BadRequestException('This event does not accept exception requests');
    }

    const existingException = await this.exceptionRepo.findOne({
      where: { attendee_id: attendee.id, requested_event_id: requestedEventId, status: 'pending' },
    });
    if (existingException) {
      throw new BadRequestException('You already have a pending exception request for this event');
    }

    const exception = this.exceptionRepo.create({
      attendee_id: attendee.id,
      requested_event_id: requestedEventId,
      reason,
    });
    const saved = await this.exceptionRepo.save(exception);
    return saved;
  }

  async findAll() {
    const exceptions = await this.exceptionRepo.find({
      relations: ['attendee', 'requested_event', 'requested_event.event_type'],
      order: { created_at: 'DESC' },
    });

    // Enrich with the attendee's current registration in the same event type
    const enriched = await Promise.all(
      exceptions.map(async (ex) => {
        const requestedTypeId = ex.requested_event?.event_type_id;
        let currentReg: Registration | null = null;
        if (requestedTypeId) {
          currentReg = await this.registrationRepo
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.event', 'e')
            .leftJoinAndSelect('e.event_type', 'et')
            .where('r.attendee_id = :aid', { aid: ex.attendee_id })
            .andWhere('e.event_type_id = :etid', { etid: requestedTypeId })
            .orderBy('r.registered_at', 'DESC')
            .getOne();
        }
        return {
          ...ex,
          current_event: currentReg?.event ?? null,
          // backwards-compat alias for any callers still using the old key
          current_workshop: currentReg?.event ?? null,
        };
      }),
    );

    return enriched;
  }

  async approve(id: string, adminId: string) {
    const exception = await this.exceptionRepo.findOne({
      where: { id },
      relations: ['attendee', 'requested_event'],
    });
    if (!exception) throw new NotFoundException('Exception request not found');
    if (exception.status !== 'pending') throw new BadRequestException('Already processed');

    exception.status = 'approved';
    exception.reviewed_by = adminId;
    exception.reviewed_at = new Date();
    await this.exceptionRepo.save(exception);

    const registration = this.registrationRepo.create({
      attendee_id: exception.attendee_id,
      event_id: exception.requested_event_id,
      motivation: `Exception approved: ${exception.reason}`,
      status: 'confirmed',
    });
    await this.registrationRepo.save(registration);

    return exception;
  }

  async reject(id: string, adminId: string) {
    const exception = await this.exceptionRepo.findOne({
      where: { id },
      relations: ['attendee', 'requested_event'],
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
