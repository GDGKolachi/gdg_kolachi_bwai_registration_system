import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workshop } from '../entities/workshop.entity';
import { Registration } from '../entities/registration.entity';
import { WorkshopsService } from './workshops.service';
import { WorkshopsController } from './workshops.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Workshop, Registration])],
  controllers: [WorkshopsController],
  providers: [WorkshopsService],
  exports: [WorkshopsService],
})
export class WorkshopsModule {}
