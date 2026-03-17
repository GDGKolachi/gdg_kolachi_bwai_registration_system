import { IsString, IsEmail, IsUUID, MinLength } from 'class-validator';

export class CreateExceptionDto {
  @IsEmail()
  email: string;

  @IsUUID()
  requested_workshop_id: string;

  @IsString()
  @MinLength(20)
  reason: string;
}
