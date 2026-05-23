import { IsObject, IsOptional, IsString } from 'class-validator';

export class LogAnalyticsEventDto {
  @IsString()
  eventType: string;

  @IsOptional()
  @IsString()
  venueId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
