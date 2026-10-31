import { IsEmail, IsOptional } from 'class-validator';

export class TestReminderDto {
  /** Where to send the test. Defaults to the signed-in admin's email. */
  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string;
}
