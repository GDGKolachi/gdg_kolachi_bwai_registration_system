import { IsArray, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class SelfResendDto {
  @IsEmail()
  email: string;

  @IsUUID()
  event_id: string;
}

export class SendBulkDto {
  @IsUUID()
  event_id: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  registration_ids?: string[];
}
