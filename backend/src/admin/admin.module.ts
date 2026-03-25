import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Workshop } from '../entities/workshop.entity';
import { Registration } from '../entities/registration.entity';
import { ExceptionRequest } from '../entities/exception-request.entity';
import { Attendee } from '../entities/attendee.entity';
import { Admin } from '../entities/admin.entity';
import { WorkshopsModule } from '../workshops/workshops.module';
import { RegistrationsModule } from '../registrations/registrations.module';
import { ExceptionsModule } from '../exceptions/exceptions.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workshop, Registration, ExceptionRequest, Attendee, Admin]),
    WorkshopsModule,
    RegistrationsModule,
    ExceptionsModule,
    EmailModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
