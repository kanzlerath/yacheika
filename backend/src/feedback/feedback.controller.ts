import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { UserFeedbackStatus } from '../entities/user-feedback.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('api/users/me/feedback')
  @UseGuards(TelegramAuthGuard)
  async createAsUser(@Body() data: CreateFeedbackDto, @Req() request: any) {
    return this.feedbackService.create(data, request.telegramSession);
  }

  @Get('api/admin/feedback')
  @UseGuards(AdminGuard)
  async getAdminFeedback() {
    return this.feedbackService.findAll();
  }

  @Patch('api/admin/feedback/:id')
  @UseGuards(AdminGuard)
  async updateAdminFeedback(@Param('id') id: string, @Body() data: { status?: UserFeedbackStatus }) {
    return this.feedbackService.updateStatus(id, data.status);
  }
}
