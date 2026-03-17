import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExceptionRequest } from '../entities/exception-request.entity';
import { Attendee } from '../entities/attendee.entity';
import { Workshop } from '../entities/workshop.entity';
import { Registration } from '../entities/registration.entity';
import { ExceptionsService } from './exceptions.service';
import { ExceptionsController } from './exceptions.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([ExceptionRequest, Attendee, Workshop, Registration]), EmailModule],
  controllers: [ExceptionsController],
  providers: [ExceptionsService],
  exports: [ExceptionsService],
})
export class ExceptionsModule {}
