import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { EventService } from './event.service';

@Controller('api/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async getEvents() {
    return this.eventService.findAll();
  }

  @Post()
  @UseGuards(AdminGuard)
  async saveEvent(@Body() eventData: any) {
    return this.eventService.createOrUpdate(eventData);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteEvent(@Param('id') id: string) {
    return this.eventService.delete(id);
  }
}
