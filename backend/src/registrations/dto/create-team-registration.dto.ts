import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsUUID,
  IsIn,
  IsArray,
  IsBoolean,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class TeamDetailsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  // Validated in service against HACKATHON_DOMAINS — the whole team shares it.
  @IsString()
  primary_domain: string;

  @IsBoolean()
  has_idea: boolean;

  // Required in service when has_idea === true.
  @IsOptional()
  @IsString()
  idea_description?: string;

  // Validated in service against WORKED_TOGETHER_OPTIONS.
  @IsString()
  worked_together_before: string;
}

class TeamMemberDto {
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

  // Validated in service against HACKATHON_ROLES.
  @IsString()
  best_describes_you: string;

  // Every member answers the light set; validated in service against SKILL_OPTIONS.
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsBoolean()
  is_captain: boolean;

  // Captain-only questions — optional here, enforced in service for the captain.
  @IsOptional()
  @IsString()
  years_experience?: string;

  @IsOptional()
  @IsString()
  prior_hackathons?: string;

  @IsOptional()
  @IsString()
  ai_experience?: string;

  @IsOptional()
  @IsString()
  portfolio_url?: string;

  @IsOptional()
  @IsString()
  best_project?: string;

  @IsOptional()
  @IsString()
  motivation?: string;

  @IsOptional()
  @IsString()
  ambassador?: string;
}

export class CreateTeamRegistrationDto {
  @IsUUID()
  event_id: string;

  @ValidateNested()
  @Type(() => TeamDetailsDto)
  team: TeamDetailsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  members: TeamMemberDto[];
}
