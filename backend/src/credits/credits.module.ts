import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditRedemption } from '../entities/credit-redemption.entity';
import { CreditsService } from './credits.service';
import { CreditsSender } from './credits-sender.service';
import { CREDITS_MAILER, ResendCreditsMailer } from './credits.mailer';
import { CreditsPublicController } from './credits-public.controller';
import { CreditsAdminController } from './credits-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CreditRedemption])],
  controllers: [CreditsPublicController, CreditsAdminController],
  providers: [
    CreditsService,
    CreditsSender,
    { provide: CREDITS_MAILER, useClass: ResendCreditsMailer },
  ],
  exports: [CreditsService],
})
export class CreditsModule {}
