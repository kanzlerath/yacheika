import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VenueSuggestionEntity } from '../entities/venue-suggestion.entity';
import { CreateVenueSuggestionDto } from './dto/create-venue-suggestion.dto';

@Injectable()
export class VenueSuggestionService {
  constructor(
    @InjectRepository(VenueSuggestionEntity)
    private readonly suggestionRepository: Repository<VenueSuggestionEntity>,
  ) {}

  async create(data: CreateVenueSuggestionDto, user?: { id?: string; username?: string; firstName?: string; lastName?: string }) {
    const suggestion = this.suggestionRepository.create({
      id: `vs-${Math.random().toString(36).substring(2, 11)}`,
      name: data.name.trim(),
      address: data.address.trim(),
      comment: data.comment?.trim() || undefined,
      contact: data.contact?.trim() || undefined,
      userId: user?.id,
      userName: user?.username || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
      status: 'new',
    });

    return this.suggestionRepository.save(suggestion);
  }

  async findAll() {
    return this.suggestionRepository.find({ order: { createdAt: 'DESC' } });
  }
}
