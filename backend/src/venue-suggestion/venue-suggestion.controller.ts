import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { CreateVenueSuggestionDto } from './dto/create-venue-suggestion.dto';
import { VenueSuggestionService } from './venue-suggestion.service';

@Controller()
export class VenueSuggestionController {
  constructor(private readonly suggestionService: VenueSuggestionService) {}

  @Post('api/venue-suggestions')
  async create(@Body() data: CreateVenueSuggestionDto, @Req() request: any) {
    return this.suggestionService.create(data, request.telegramSession?.user);
  }

  @Post('api/users/me/venue-suggestions')
  @UseGuards(TelegramAuthGuard)
  async createAsUser(@Body() data: CreateVenueSuggestionDto, @Req() request: any) {
    return this.suggestionService.create(data, request.telegramSession?.user);
  }

  @Get('api/admin/venue-suggestions')
  @UseGuards(AdminGuard)
  async getAdminSuggestions() {
    return this.suggestionService.findAll();
  }
}
