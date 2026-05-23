import { Controller, Get, Post, Body } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { LogAnalyticsEventDto } from './dto/log-analytics-event.dto';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getFeed() {
    return this.analyticsService.getFeed();
  }

  @Post()
  async logEvent(@Body() eventData: LogAnalyticsEventDto) {
    return this.analyticsService.logEvent(eventData);
  }
}
