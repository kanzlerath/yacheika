import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { AnalyticsEventEntity } from '../entities/analytics.entity';
import { EventEntity } from '../entities/event.entity';
import { ReactionEntity } from '../entities/reaction.entity';
import { UserEntity } from '../entities/user.entity';
import { VenueEntity } from '../entities/venue.entity';

@Injectable()
export class AdminDataService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(VenueEntity)
    private readonly venueRepository: Repository<VenueEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(ReactionEntity)
    private readonly reactionRepository: Repository<ReactionEntity>,
    @InjectRepository(AnalyticsEventEntity)
    private readonly analyticsRepository: Repository<AnalyticsEventEntity>,
  ) {}

  async getUsers() {
    const users = await this.userRepository.find({ order: { createdAt: 'DESC' } });
    const userIds = users.map((user) => user.id);
    const reactionRows = userIds.length
      ? await this.reactionRepository
          .createQueryBuilder('reaction')
          .select('reaction.userId', 'userId')
          .addSelect('COUNT(*)', 'count')
          .where({ userId: In(userIds) })
          .groupBy('reaction.userId')
          .getRawMany()
      : [];

    const reactionCountByUser = new Map(reactionRows.map((row) => [row.userId, Number(row.count)]));

    return users.map((user) => ({
      id: user.id,
      telegramId: user.telegramId,
      provider: user.provider,
      providerUserId: user.providerUserId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      createdAt: user.createdAt,
      reactionsCount: reactionCountByUser.get(user.id) || 0,
    }));
  }

  async getDashboard() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      usersCount,
      newUsers7d,
      newUsers30d,
      venuesCount,
      publishedVenues,
      draftVenues,
      hiddenVenues,
      eventsCount,
      analytics24h,
      analytics7d,
      reactionsCount,
      recentEvents,
      recentUsers,
      venues,
      eventRows,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { createdAt: Between(weekAgo, now) } }),
      this.userRepository.count({ where: { createdAt: Between(monthAgo, now) } }),
      this.venueRepository.count(),
      this.venueRepository.count({ where: { status: 'published' } }),
      this.venueRepository.count({ where: { status: 'draft' } }),
      this.venueRepository.count({ where: { status: 'hidden' } }),
      this.eventRepository.count(),
      this.analyticsRepository.count({ where: { timestamp: Between(dayAgo, now) } }),
      this.analyticsRepository.count({ where: { timestamp: Between(weekAgo, now) } }),
      this.reactionRepository.count(),
      this.analyticsRepository.find({ order: { timestamp: 'DESC' }, take: 12 }),
      this.userRepository.find({ order: { createdAt: 'DESC' }, take: 8 }),
      this.venueRepository.find(),
      this.eventRepository.find({ order: { date: 'DESC', time: 'DESC' }, take: 8 }),
    ]);

    const topVenueRows = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.venueId', 'venueId')
      .addSelect('analytics.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.venueId IS NOT NULL')
      .andWhere('analytics.timestamp >= :weekAgo', { weekAgo })
      .groupBy('analytics.venueId')
      .addGroupBy('analytics.eventType')
      .getRawMany();

    const venueById = new Map(venues.map((venue) => [venue.id, venue]));
    const aggregateByVenue = new Map<string, { venueId: string; name: string; opens: number; routes: number; socials: number; total: number }>();

    topVenueRows.forEach((row) => {
      const venue = venueById.get(row.venueId);
      if (!venue) return;
      const current = aggregateByVenue.get(row.venueId) || {
        venueId: row.venueId,
        name: venue.name,
        opens: 0,
        routes: 0,
        socials: 0,
        total: 0,
      };
      const count = Number(row.count);
      current.total += count;
      if (row.eventType === 'open_venue') current.opens += count;
      if (row.eventType === 'open_route') current.routes += count;
      if (row.eventType === 'click_social' || row.eventType === 'click_phone') current.socials += count;
      aggregateByVenue.set(row.venueId, current);
    });

    const incompleteVenues = venues
      .filter((venue) => {
        const hasSchedule = !!venue.workingHoursSchedule || !!venue.workingHours;
        return !venue.gallery?.length || !hasSchedule || !venue.shortDescription || venue.status !== 'published';
      })
      .slice(0, 10)
      .map((venue) => ({
        id: venue.id,
        name: venue.name,
        status: venue.status,
        issues: [
          !venue.gallery?.length ? 'Нет фото' : null,
          !venue.workingHoursSchedule && !venue.workingHours ? 'Нет расписания' : null,
          !venue.shortDescription ? 'Нет короткого описания' : null,
          venue.status !== 'published' ? `Статус: ${venue.status}` : null,
        ].filter(Boolean),
      }));

    return {
      totals: {
        users: usersCount,
        newUsers7d,
        newUsers30d,
        venues: venuesCount,
        publishedVenues,
        draftVenues,
        hiddenVenues,
        events: eventsCount,
        reactions: reactionsCount,
        analytics24h,
        analytics7d,
      },
      topVenues: Array.from(aggregateByVenue.values()).sort((a, b) => b.total - a.total).slice(0, 8),
      recentActivity: recentEvents,
      recentUsers,
      upcomingEvents: eventRows,
      incompleteVenues,
    };
  }
}
