import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateWorkshopDto {
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
  status?: string;
}
