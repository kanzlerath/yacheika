import { Controller, Get, Post, Body } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getFeed() {
    return this.analyticsService.getFeed();
  }

  @Post()
  async logEvent(
    @Body('eventType') eventType: string,
    @Body('venueId') venueId?: string,
    @Body('userId') userId?: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    return this.analyticsService.logEvent({
      eventType,
      venueId,
      userId,
      metadata,
    });
  }
}
