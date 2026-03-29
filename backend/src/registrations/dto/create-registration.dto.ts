import { IsString, IsEmail, IsOptional, IsUUID, IsIn, Matches } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @Matches(/^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?\d{6,14}$/, {
    message: 'Please provide a valid phone number (e.g. +92 300 1234567)',
  })
  phone: string;

  @IsString()
  university_org: string;

  @IsOptional()
  @IsString()
  github?: string;

  @IsString()
  linkedin: string;

  @IsString()
  cnic: string;

  @IsString()
  @IsIn(['Male', 'Female', 'Non-Binary', 'Prefer not to say'], {
    message: 'Gender must be one of: Male, Female, Non-Binary, Prefer not to say',
  })
  gender: string;

  @IsString()
  @IsIn(['Student', 'Young Professional', 'Intermediate Expert', 'Senior Expert', 'Freelancer', 'Other'], {
    message: 'Please select what defines you best',
  })
  defines_you_best: string;

  @IsUUID()
  workshop_id: string;

  @IsString()
  motivation: string;
}
