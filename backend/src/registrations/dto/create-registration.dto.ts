import { IsString, IsEmail, IsOptional, IsUUID, IsIn, Matches } from 'class-validator';

export class CreateRegistrationDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @Matches(/^(\+?92[\s-]?|0)3\d{2}[\s-]?\d{7}$/, {
    message: 'Please provide a valid Pakistani phone number (e.g. 03XX-XXXXXXX)',
  })
  phone: string;

  @IsString()
  university_org: string;

  @IsOptional()
  @IsString()
  github?: string;

  @IsString()
  linkedin: string;

  @Matches(/^\d{5}-?\d{7}-?\d{1}$/, {
    message: 'CNIC must be 13 digits in format XXXXX-XXXXXXX-X',
  })
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
