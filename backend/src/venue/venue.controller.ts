import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
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

  @Get('admin/all')
  @UseGuards(AdminGuard)
  async getAdminVenues(
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
      includeNonPublished: true,
    });
  }

  @Get(':id')
  async getVenue(@Param('id') id: string) {
    return this.venueService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  async saveVenue(@Body() venueData: SaveVenueDto) {
    return this.venueService.createOrUpdate(venueData);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteVenue(@Param('id') id: string) {
    return this.venueService.delete(id);
  }
}
