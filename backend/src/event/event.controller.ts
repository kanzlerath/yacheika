import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { EventService } from './event.service';
import { SaveEventDto } from './dto/save-event.dto';

@Controller('api/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async getEvents() {
    return this.eventService.findAll();
  }

  @Get('admin/all')
  @UseGuards(AdminGuard)
  async getAdminEvents() {
    return this.eventService.findAll({ includeNonPublished: true });
  }

  @Get('me/attendance')
  @UseGuards(TelegramAuthGuard)
  async getMyAttendance(@Req() request: any) {
    return this.eventService.findUserAttendance(request.telegramSession.userId);
  }

  @Post(':id/attendance')
  @UseGuards(TelegramAuthGuard)
  async setAttendance(
    @Param('id') eventId: string,
    @Req() request: any,
    @Body() body: { status?: 'going' | 'not_going' },
  ) {
    if (!body?.status || !['going', 'not_going'].includes(body.status)) {
      throw new BadRequestException('Unsupported attendance status');
    }
    return this.eventService.toggleAttendance(eventId, request.telegramSession.userId, body.status);
  }

  @Post()
  @UseGuards(AdminGuard)
  async saveEvent(@Body() eventData: SaveEventDto) {
    return this.eventService.createOrUpdate(eventData);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteEvent(@Param('id') id: string) {
    return this.eventService.delete(id);
  }
}
