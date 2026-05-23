import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../entities/event.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
  ) {}

  async findAll() {
    return this.eventRepository.find({
      order: { date: 'ASC', time: 'ASC' },
    });
  }

  async createOrUpdate(data: any) {
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
