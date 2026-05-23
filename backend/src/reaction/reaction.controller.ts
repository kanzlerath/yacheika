import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ReactionService } from './reaction.service';

@Controller()
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Get('api/users/:userId/reactions')
  async getUserReactions(@Param('userId') userId: string) {
    return this.reactionService.findUserReactions(userId);
  }

  @Post('api/venues/:id/react')
  async reactVenue(
    @Param('id') venueId: string,
    @Body('userId') userId: string,
    @Body('type') type: 'like' | 'not_my_place' | 'vibe_tag',
    @Body('vibeTag') vibeTag?: string,
  ) {
    return this.reactionService.toggleReaction(venueId, userId, type, vibeTag);
  }
}
