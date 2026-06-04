import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVenueSuggestionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  comment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  contact?: string;
}
