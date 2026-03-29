import { IsArray, IsEnum, ArrayMinSize, IsUUID } from 'class-validator';
import { RegistrationStatus } from '../../common/enums/registration-status.enum';

export class UpdateRegistrationStatusDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one registration ID is required' })
  @IsUUID('4', { each: true, message: 'Each id must be a valid UUID' })
  ids: string[];

  @IsEnum(RegistrationStatus, {
    message: `status must be one of: ${Object.values(RegistrationStatus).join(', ')}`,
  })
  status: RegistrationStatus;
}
