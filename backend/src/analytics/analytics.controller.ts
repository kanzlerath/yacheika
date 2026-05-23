import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { AnalyticsService } from './analytics.service';
import { LogAnalyticsEventDto } from './dto/log-analytics-event.dto';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @UseGuards(AdminGuard)
  async getFeed() {
    return this.analyticsService.getFeed();
  }

  @Post()
  @UseGuards(TelegramAuthGuard)
  async logEvent(
    @Req() request: any,
    @Body('eventType') eventType: string,
    @Body('venueId') venueId?: string,
    @Body('metadata') metadata?: Record<string, any>,
  ) {
    if (!eventType) {
      throw new BadRequestException('eventType is required');
    }

    return this.analyticsService.logEvent({
      eventType,
      venueId,
      userId: request.telegramSession.telegramId,
      metadata,
    });
  }
}
