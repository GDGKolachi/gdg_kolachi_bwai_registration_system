import { IsString, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  university_org: string;

  @IsOptional()
  @IsString()
  github_linkedin?: string;

  @IsString()
  cnic: string;

  @IsUUID()
  workshop_id: string;

  @IsString()
  motivation: string;
}
