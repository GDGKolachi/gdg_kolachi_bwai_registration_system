import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, IsUUID, IsUrl, ValidateIf, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class SpeakerDto {
  @IsString()
  name: string;

  @IsString()
  role: string;

  @IsOptional()
  @IsString()
  photo_url?: string;
}

export class CreateEventDto {
  @IsUUID()
  event_type_id: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  date: string;

  @IsString()
  time: string;

  @IsString()
  venue: string;

  @IsNumber()
  @Min(1)
  max_capacity: number;

  @IsOptional()
  @IsString()
  map_location?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakerDto)
  speakers?: SpeakerDto[];

  @IsOptional()
  @IsString()
  special_instructions?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  allow_exceptions?: boolean;

  @IsOptional()
  @IsBoolean()
  is_online?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tracks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slots?: string[];

  @IsOptional()
  acknowledgement_deadline?: Date;

  @IsOptional()
  @IsBoolean()
  acknowledgement_locked?: boolean;

  // Google Cloud credits email. https only; null or '' clears the value.
  @IsOptional()
  @IsBoolean()
  credits_enabled?: boolean;

  @ValidateIf((_o, v) => v !== undefined && v !== null && v !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  credits_claim_url?: string | null;

  @ValidateIf((_o, v) => v !== undefined && v !== null && v !== '')
  @IsUrl({ protocols: ['https'], require_protocol: true })
  credits_video_url?: string | null;
}
