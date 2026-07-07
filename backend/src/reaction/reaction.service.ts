import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReactionEntity } from '../entities/reaction.entity';
import { UserEntity } from '../entities/user.entity';
import { VenueEntity } from '../entities/venue.entity';
import { VenueService } from '../venue/venue.service';

@Injectable()
export class ReactionService {
  constructor(
    @InjectRepository(ReactionEntity)
    private readonly reactionRepository: Repository<ReactionEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(VenueEntity)
    private readonly venueRepository: Repository<VenueEntity>,
    private readonly venueService: VenueService,
  ) {}

  async findUserReactions(userId: string) {
    return this.reactionRepository.find({
      where: { userId },
    });
  }

  async toggleReaction(
    venueId: string,
    userId: string,
    type: 'like' | 'not_my_place' | 'vibe_tag',
    vibeTag?: string,
  ) {
    const venue = await this.venueRepository.findOne({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException(`Venue with ID "${venueId}" not found`);
    }

    // Ensure user exists in our simulation DB
    let user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      user = this.userRepository.create({
        id: userId,
        provider: userId.startsWith('ya-') ? 'yandex' : 'telegram',
        providerUserId: userId.replace(/^tg-/, '').replace(/^ya-/, ''),
        telegramId: userId.startsWith('tg-') ? userId.replace('tg-', '') : null,
        username: userId.replace(/^tg-/, '').replace(/^ya-/, '') + '_sim',
        firstName: 'Tester_' + userId.substring(3),
      });
      await this.userRepository.save(user);
    }

    // Check if the exact reaction already exists
    const existing = await this.reactionRepository.findOne({
      where: {
        userId,
        venueId,
        type,
        vibeTag: vibeTag || null,
      },
    });

    if (existing) {
      // Toggle off (delete)
      await this.reactionRepository.remove(existing);
      const updatedVenue = await this.venueService.findOne(venueId);
      return { removed: true, venue: updatedVenue };
    }

    // If adding a like/not_my_place, clean up the opposite one
    if (type === 'like') {
      const opposite = await this.reactionRepository.findOne({
        where: { userId, venueId, type: 'not_my_place' },
      });
      if (opposite) {
        await this.reactionRepository.remove(opposite);
      }
    } else if (type === 'not_my_place') {
      const opposite = await this.reactionRepository.findOne({
        where: { userId, venueId, type: 'like' },
      });
      if (opposite) {
        await this.reactionRepository.remove(opposite);
      }
    }

    // Save new reaction
    const newReaction = this.reactionRepository.create({
      id: `r-${Math.random().toString(36).substring(2, 11)}`,
      userId,
      venueId,
      type,
      vibeTag: vibeTag || null,
    } as Partial<ReactionEntity>);
    await this.reactionRepository.save(newReaction);

    const updatedVenue = await this.venueService.findOne(venueId);
    return { added: true, venue: updatedVenue };
  }
}
