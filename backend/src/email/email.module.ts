import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplate } from '../entities/email-template.entity';
import { EmailSetting } from '../entities/email-setting.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate, EmailSetting])],
  controllers: [EmailTemplatesController],
  providers: [EmailService, EmailTemplatesService],
  exports: [EmailService, EmailTemplatesService],
})
export class EmailModule {}
