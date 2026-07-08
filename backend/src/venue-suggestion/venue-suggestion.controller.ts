import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { VenueSuggestionStatus } from '../entities/venue-suggestion.entity';
import { CreateVenueSuggestionDto } from './dto/create-venue-suggestion.dto';
import { VenueSuggestionService } from './venue-suggestion.service';

@Controller()
export class VenueSuggestionController {
  constructor(private readonly suggestionService: VenueSuggestionService) {}

  @Post('api/users/me/venue-suggestions')
  @UseGuards(TelegramAuthGuard)
  async createAsUser(@Body() data: CreateVenueSuggestionDto, @Req() request: any) {
    return this.suggestionService.create(data, request.telegramSession);
  }

  @Get('api/admin/venue-suggestions')
  @UseGuards(AdminGuard)
  async getAdminSuggestions() {
    return this.suggestionService.findAll();
  }

  @Patch('api/admin/venue-suggestions/:id')
  @UseGuards(AdminGuard)
  async updateAdminSuggestion(
    @Param('id') id: string,
    @Body() data: { status?: VenueSuggestionStatus },
  ) {
    return this.suggestionService.updateStatus(id, data.status);
  }
}
