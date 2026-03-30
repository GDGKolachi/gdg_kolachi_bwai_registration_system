import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Registration } from '../entities/registration.entity';
import { Attendee } from '../entities/attendee.entity';
import { Workshop } from '../entities/workshop.entity';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Registration, Attendee, Workshop])],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
