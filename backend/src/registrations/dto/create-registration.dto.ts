import { IsString, IsEmail, IsOptional, IsUUID, IsIn, IsArray, Matches } from 'class-validator';

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

  // Validated dynamically in the service against the event's type
  // (6-item list for Workshop/Talks/Community Lounge, 15-item for Hackathon).
  @IsString()
  best_describes_you: string;

  @IsUUID()
  event_id: string;

  @IsOptional()
  @IsString()
  motivation?: string;

  // Hackathon only — validated in service.
  @IsOptional()
  @IsString()
  domain?: string;

  // Community Lounge only — validated against event.tracks in service.
  @IsOptional()
  @IsString()
  track?: string;

  // Community Lounge only — validated against event.slots in service.
  @IsOptional()
  @IsString()
  slot?: string;

  // Optional referral — name of the ambassador who referred the attendee.
  @IsOptional()
  @IsString()
  ambassador?: string;

  // Hackathon shortlisting answers — validated in service against the
  // option lists in common/constants/hackathon.constants.
  @IsOptional()
  @IsString()
  years_experience?: string;

  @IsOptional()
  @IsString()
  prior_hackathons?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  ai_experience?: string;

  @IsOptional()
  @IsString()
  portfolio_url?: string;

  @IsOptional()
  @IsString()
  best_project?: string;
}
