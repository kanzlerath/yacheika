import { IsArray, IsOptional, IsString } from 'class-validator';

export class SaveCollectionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  cover: string;

  @IsArray()
  @IsString({ each: true })
  venueIds: string[];
}
