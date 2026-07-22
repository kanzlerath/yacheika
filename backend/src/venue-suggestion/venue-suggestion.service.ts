import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { VenueSuggestionEntity, VenueSuggestionStatus } from '../entities/venue-suggestion.entity';
import { CreateVenueSuggestionDto } from './dto/create-venue-suggestion.dto';

@Injectable()
export class VenueSuggestionService {
  constructor(
    @InjectRepository(VenueSuggestionEntity)
    private readonly suggestionRepository: Repository<VenueSuggestionEntity>,
  ) {}

  async create(data: CreateVenueSuggestionDto, user?: { userId?: string; username?: string }) {
    const suggestion = this.suggestionRepository.create({
      id: `vs-${Math.random().toString(36).substring(2, 11)}`,
      name: data.name.trim(),
      address: data.address.trim(),
      comment: data.comment?.trim() || undefined,
      contact: data.contact?.trim() || undefined,
      userId: user?.userId,
      userName: user?.username,
      status: 'new',
    });

    return this.suggestionRepository.save(suggestion);
  }

  async findAll() {
    return this.suggestionRepository.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * Rejections deliberately remain private: the author only sees positive
   * updates once a suggestion is being reviewed or has been accepted.
   */
  async findPositiveUpdatesForUser(userId: string) {
    return this.suggestionRepository.find({
      where: {
        userId,
        status: In(['reviewed', 'converted']),
      },
      order: { updatedAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status?: VenueSuggestionStatus) {
    const allowedStatuses: VenueSuggestionStatus[] = ['new', 'reviewed', 'rejected', 'converted'];
    if (!status || !allowedStatuses.includes(status)) {
      throw new BadRequestException('Unsupported suggestion status');
    }

    const suggestion = await this.suggestionRepository.findOne({ where: { id } });
    if (!suggestion) {
      throw new NotFoundException('Venue suggestion not found');
    }

    suggestion.status = status;
    return this.suggestionRepository.save(suggestion);
  }
}
