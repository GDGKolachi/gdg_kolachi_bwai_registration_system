import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Event } from '../entities/event.entity';
import { Registration } from '../entities/registration.entity';
import { ExceptionRequest } from '../entities/exception-request.entity';
import { Attendee } from '../entities/attendee.entity';
import { Admin } from '../entities/admin.entity';
import { EventsModule } from '../events/events.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { ExceptionsModule } from '../exceptions/exceptions.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Registration, ExceptionRequest, Attendee, Admin]),
    EventsModule,
    RegistrationsModule,
    ExceptionsModule,
    EmailModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
