import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../entities/event.entity';
import { VenueEntity } from '../entities/venue.entity';
import { SaveEventDto } from './dto/save-event.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(VenueEntity)
    private readonly venueRepository: Repository<VenueEntity>,
  ) {}

  async findAll(options: { includeNonPublished?: boolean } = {}) {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .orderBy('event.date', 'ASC')
      .addOrderBy('event.time', 'ASC');

    if (!options.includeNonPublished) {
      qb.where('venue.status = :status', { status: 'published' });
    }

    return qb.getMany();
  }

  async createOrUpdate(data: SaveEventDto) {
    const venue = await this.venueRepository.findOne({ where: { id: data.venueId } });
    if (!venue) {
      throw new BadRequestException('Event venue does not exist');
    }

    const id = data.id || `e-${Math.random().toString(36).substring(2, 11)}`;
    let event = await this.eventRepository.findOne({ where: { id } });

    if (event) {
      event = this.eventRepository.merge(event, data);
    } else {
      event = this.eventRepository.create({ ...data, id } as Partial<EventEntity>);
    }

    return this.eventRepository.save(event);
  }

  async delete(id: string) {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
    await this.eventRepository.delete(id);
    return { success: true };
  }
}
