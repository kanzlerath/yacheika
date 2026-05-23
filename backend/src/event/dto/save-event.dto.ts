import { IsOptional, IsString, Matches } from 'class-validator';

export class SaveEventDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  venueId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time: string;

  @IsOptional()
  @IsString()
  coverImage?: string;
}
