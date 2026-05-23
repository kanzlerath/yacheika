import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { EventService } from './event.service';
import { SaveEventDto } from './dto/save-event.dto';

@Controller('api/events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  async getEvents() {
    return this.eventService.findAll();
  }

  @Post()
  async saveEvent(@Body() eventData: SaveEventDto) {
    return this.eventService.createOrUpdate(eventData);
  }

  @Delete(':id')
  async deleteEvent(@Param('id') id: string) {
    return this.eventService.delete(id);
  }
}
