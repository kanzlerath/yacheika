import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { VenueService } from './venue.service';
import { SaveVenueDto } from './dto/save-venue.dto';

@Controller('api/venues')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Get()
  async getVenues(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('userLat') userLat?: string,
    @Query('userLng') userLng?: string,
  ) {
    return this.venueService.findAll({
      category,
      tag,
      search,
      userLat: userLat ? Number(userLat) : undefined,
      userLng: userLng ? Number(userLng) : undefined,
    });
  }

  @Get(':id')
  async getVenue(@Param('id') id: string) {
    return this.venueService.findOne(id);
  }

  @Post()
  async saveVenue(@Body() venueData: SaveVenueDto) {
    return this.venueService.createOrUpdate(venueData);
  }

  @Delete(':id')
  async deleteVenue(@Param('id') id: string) {
    return this.venueService.delete(id);
  }
}
