import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { TelegramAuthGuard } from '../auth/telegram-auth.guard';
import { ReactionService } from './reaction.service';
import { ReactVenueDto } from './dto/react-venue.dto';

@Controller()
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Get('api/users/me/reactions')
  @UseGuards(TelegramAuthGuard)
  async getMyReactions(@Req() request: any) {
    return this.reactionService.findUserReactions(request.telegramSession.userId);
  }

  @Get('api/users/:userId/reactions')
  @UseGuards(AdminGuard)
  async getUserReactions(@Param('userId') userId: string) {
    return this.reactionService.findUserReactions(userId);
  }

  @Post('api/venues/:id/react')
  @UseGuards(TelegramAuthGuard)
  async reactVenue(
    @Param('id') venueId: string,
    @Req() request: any,
    @Body() data: ReactVenueDto,
  ) {
    const { type, vibeTag } = data;

    if (!['like', 'not_my_place', 'vibe_tag'].includes(type)) {
      throw new BadRequestException('Unsupported reaction type');
    }

    if (type === 'vibe_tag' && !vibeTag) {
      throw new BadRequestException('vibeTag is required for vibe_tag reactions');
    }

    return this.reactionService.toggleReaction(
      venueId,
      request.telegramSession.userId,
      type,
      type === 'vibe_tag' ? vibeTag : undefined,
    );
  }
}
