import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { CreditsModule } from '../credits/credits.module';
import { OnlineService } from './online.service';
import { OnlineReminderScheduler } from './online-reminder.scheduler';
import {
  OnlineAdminController,
  OnlinePublicController,
} from './online.controller';

/** Online sessions: the "starting soon" reminder and attendee self check-in. */
@Module({
  imports: [EmailModule, CreditsModule],
  controllers: [OnlinePublicController, OnlineAdminController],
  providers: [OnlineService, OnlineReminderScheduler],
})
export class OnlineModule {}
