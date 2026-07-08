import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
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
