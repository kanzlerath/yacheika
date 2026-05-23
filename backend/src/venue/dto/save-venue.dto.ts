import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class VenueContactsDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  telegram?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  vk?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

class PremiumColorsDto {
  @IsString()
  primary: string;

  @IsString()
  accent: string;

  @IsString()
  glowColor: string;
}

class PremiumConfigDto {
  @IsBoolean()
  premiumActive: boolean;

  @IsOptional()
  @IsString()
  premiumTheme?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PremiumColorsDto)
  customColors?: PremiumColorsDto;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsString()
  moodBlock?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featuredDrinks?: string[];

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsString()
  ctaText?: string;
}

export class SaveVenueDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  shortDescription: string;

  @IsString()
  fullDescription: string;

  @IsString()
  address: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  workingHours: string;

  @ValidateNested()
  @Type(() => VenueContactsDto)
  contacts: VenueContactsDto;

  @IsArray()
  @IsString({ each: true })
  gallery: string[];

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsOptional()
  @IsIn(['draft', 'published', 'hidden', 'archived'])
  status?: string;

  @ValidateNested()
  @Type(() => PremiumConfigDto)
  premiumConfig: PremiumConfigDto;
}
