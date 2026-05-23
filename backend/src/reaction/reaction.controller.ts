import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { ReactVenueDto } from './dto/react-venue.dto';

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
    @Body() reactionData: ReactVenueDto,
  ) {
    return this.reactionService.toggleReaction(
      venueId,
      reactionData.userId,
      reactionData.type,
      reactionData.type === 'vibe_tag' ? reactionData.vibeTag : undefined,
    );
  }
}
