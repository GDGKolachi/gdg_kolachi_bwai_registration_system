import { IsString, IsEmail, IsUUID, MinLength } from 'class-validator';

export class CreateExceptionDto {
  @IsEmail()
  email: string;

  @IsUUID()
  requested_event_id: string;

  @IsString()
  @MinLength(20)
  reason: string;
}
