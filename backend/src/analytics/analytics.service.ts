import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEventEntity } from '../entities/analytics.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEventEntity)
    private readonly analyticsRepository: Repository<AnalyticsEventEntity>,
  ) {}

  async logEvent(data: {
    eventType: string;
    venueId?: string;
    userId?: string;
    metadata?: Record<string, any>;
  }) {
    const event = this.analyticsRepository.create({
      ...data,
      timestamp: new Date(),
    });
    return this.analyticsRepository.save(event);
  }

  async getFeed() {
    return this.analyticsRepository.find({
      order: { timestamp: 'DESC' },
      take: 300,
    });
  }
}
