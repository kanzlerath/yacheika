import { Injectable, NotFoundException } from '@nestjs/common';
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

  async getVenueAudit(id: string) {
    const venue = await this.venueRepository.findOne({ where: { id } });
    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      allAnalyticsRows,
      weekAnalyticsRows,
      monthAnalyticsRows,
      dailyAnalyticsRows,
      reactionRows,
      dailyReactionRows,
      recentAnalytics,
      recentReactions,
      upcomingEvents,
    ] = await Promise.all([
      this.aggregateAnalyticsByType(id),
      this.aggregateAnalyticsByType(id, weekAgo),
      this.aggregateAnalyticsByType(id, monthAgo),
      this.analyticsRepository
        .createQueryBuilder('analytics')
        .select("TO_CHAR(DATE_TRUNC('day', analytics.timestamp), 'YYYY-MM-DD')", 'date')
        .addSelect('analytics.eventType', 'eventType')
        .addSelect('COUNT(*)', 'count')
        .where('analytics.venueId = :id', { id })
        .andWhere('analytics.timestamp >= :monthAgo', { monthAgo })
        .groupBy("DATE_TRUNC('day', analytics.timestamp)")
        .addGroupBy('analytics.eventType')
        .orderBy("DATE_TRUNC('day', analytics.timestamp)", 'ASC')
        .getRawMany(),
      this.reactionRepository
        .createQueryBuilder('reaction')
        .select('reaction.type', 'type')
        .addSelect('reaction.vibeTag', 'vibeTag')
        .addSelect('COUNT(*)', 'count')
        .where('reaction.venueId = :id', { id })
        .groupBy('reaction.type')
        .addGroupBy('reaction.vibeTag')
        .getRawMany(),
      this.reactionRepository
        .createQueryBuilder('reaction')
        .select("TO_CHAR(DATE_TRUNC('day', reaction.createdAt), 'YYYY-MM-DD')", 'date')
        .addSelect('reaction.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('reaction.venueId = :id', { id })
        .andWhere('reaction.createdAt >= :monthAgo', { monthAgo })
        .groupBy("DATE_TRUNC('day', reaction.createdAt)")
        .addGroupBy('reaction.type')
        .orderBy("DATE_TRUNC('day', reaction.createdAt)", 'ASC')
        .getRawMany(),
      this.analyticsRepository.find({
        where: { venueId: id },
        order: { timestamp: 'DESC' },
        take: 40,
      }),
      this.reactionRepository.find({
        where: { venueId: id },
        order: { createdAt: 'DESC' },
        take: 30,
      }),
      this.eventRepository.find({
        where: { venueId: id },
        order: { date: 'ASC', time: 'ASC' },
        take: 8,
      }),
    ]);

    const totalAnalytics = this.analyticsRowsToMap(allAnalyticsRows);
    const weekAnalytics = this.analyticsRowsToMap(weekAnalyticsRows);
    const monthAnalytics = this.analyticsRowsToMap(monthAnalyticsRows);
    const reactions = this.reactionRowsToSummary(reactionRows);
    const opens = totalAnalytics.open_venue || 0;
    const actionCount = this.sumAnalyticsActions(totalAnalytics);

    return {
      venueId: venue.id,
      generatedAt: now,
      totals: {
        views: opens,
        routes: totalAnalytics.open_route || 0,
        phoneClicks: totalAnalytics.click_phone || 0,
        socialClicks: totalAnalytics.click_social || 0,
        eventOpens: totalAnalytics.open_event || 0,
        actions: actionCount,
        likes: reactions.likes,
        notMyPlace: reactions.notMyPlace,
        vibeTags: reactions.vibeTotal,
        uniqueUsers: await this.countUniqueAnalyticsUsers(id),
        conversionRate: opens ? Number((actionCount / opens).toFixed(3)) : 0,
      },
      periods: {
        last7d: this.buildPeriodSummary(weekAnalytics),
        last30d: this.buildPeriodSummary(monthAnalytics),
      },
      daily: this.buildDailyAudit(dailyAnalyticsRows, dailyReactionRows),
      reactions,
      recentAnalytics,
      recentReactions,
      upcomingEvents,
      quality: this.buildVenueQualityChecklist(venue, upcomingEvents.length),
    };
  }

  private aggregateAnalyticsByType(venueId: string, since?: Date) {
    const query = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.venueId = :venueId', { venueId })
      .groupBy('analytics.eventType');

    if (since) {
      query.andWhere('analytics.timestamp >= :since', { since });
    }

    return query.getRawMany();
  }

  private analyticsRowsToMap(rows: Array<{ eventType: string; count: string }>) {
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.eventType] = Number(row.count);
      return acc;
    }, {});
  }

  private sumAnalyticsActions(values: Record<string, number>) {
    return (
      (values.open_route || 0) +
      (values.click_phone || 0) +
      (values.click_social || 0) +
      (values.open_event || 0)
    );
  }

  private buildPeriodSummary(values: Record<string, number>) {
    return {
      views: values.open_venue || 0,
      routes: values.open_route || 0,
      phoneClicks: values.click_phone || 0,
      socialClicks: values.click_social || 0,
      eventOpens: values.open_event || 0,
      actions: this.sumAnalyticsActions(values),
    };
  }

  private reactionRowsToSummary(rows: Array<{ type: string; vibeTag: string | null; count: string }>) {
    const vibeTags: Array<{ tag: string; count: number }> = [];
    let likes = 0;
    let notMyPlace = 0;
    let vibeTotal = 0;

    rows.forEach((row) => {
      const count = Number(row.count);
      if (row.type === 'like') likes += count;
      if (row.type === 'not_my_place') notMyPlace += count;
      if (row.type === 'vibe_tag') {
        vibeTotal += count;
        if (row.vibeTag) vibeTags.push({ tag: row.vibeTag, count });
      }
    });

    return {
      likes,
      notMyPlace,
      vibeTotal,
      vibeTags: vibeTags.sort((a, b) => b.count - a.count),
    };
  }

  private buildDailyAudit(
    analyticsRows: Array<{ date: string; eventType: string; count: string }>,
    reactionRows: Array<{ date: string; type: string; count: string }>,
  ) {
    const rowsByDate = new Map<string, {
      date: string;
      views: number;
      routes: number;
      phoneClicks: number;
      socialClicks: number;
      eventOpens: number;
      likes: number;
      notMyPlace: number;
      vibeTags: number;
    }>();

    const ensure = (date: string) => {
      const existing = rowsByDate.get(date);
      if (existing) return existing;
      const row = {
        date,
        views: 0,
        routes: 0,
        phoneClicks: 0,
        socialClicks: 0,
        eventOpens: 0,
        likes: 0,
        notMyPlace: 0,
        vibeTags: 0,
      };
      rowsByDate.set(date, row);
      return row;
    };

    analyticsRows.forEach((row) => {
      const target = ensure(row.date);
      const count = Number(row.count);
      if (row.eventType === 'open_venue') target.views += count;
      if (row.eventType === 'open_route') target.routes += count;
      if (row.eventType === 'click_phone') target.phoneClicks += count;
      if (row.eventType === 'click_social') target.socialClicks += count;
      if (row.eventType === 'open_event') target.eventOpens += count;
    });

    reactionRows.forEach((row) => {
      const target = ensure(row.date);
      const count = Number(row.count);
      if (row.type === 'like') target.likes += count;
      if (row.type === 'not_my_place') target.notMyPlace += count;
      if (row.type === 'vibe_tag') target.vibeTags += count;
    });

    return Array.from(rowsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  private async countUniqueAnalyticsUsers(venueId: string) {
    const row = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(DISTINCT analytics.userId)', 'count')
      .where('analytics.venueId = :venueId', { venueId })
      .andWhere('analytics.userId IS NOT NULL')
      .getRawOne();
    return Number(row?.count || 0);
  }

  private buildVenueQualityChecklist(venue: VenueEntity, eventsCount: number) {
    const contacts = venue.contacts || {};
    const premiumConfig = venue.premiumConfig || { premiumActive: false };
    const hasSchedule = Boolean(venue.workingHoursSchedule || venue.workingHours);
    const checks = [
      {
        id: 'status',
        label: 'Карточка опубликована',
        ok: venue.status === 'published',
        severity: 'critical',
        detail: venue.status === 'published' ? 'Видна пользователям.' : `Текущий статус: ${venue.status}.`,
      },
      {
        id: 'description',
        label: 'Есть описание',
        ok: Boolean(venue.shortDescription && venue.fullDescription),
        severity: 'critical',
        detail: 'Короткое и полное описание помогают понять формат места.',
      },
      {
        id: 'gallery',
        label: 'Есть галерея',
        ok: Boolean(venue.gallery?.length),
        severity: 'warning',
        detail: venue.gallery?.length ? `${venue.gallery.length} фото.` : 'Нужно хотя бы одно фото.',
      },
      {
        id: 'schedule',
        label: 'Заполнено расписание',
        ok: hasSchedule,
        severity: 'warning',
        detail: hasSchedule ? 'Время работы заполнено.' : 'Гости не увидят, когда место открыто.',
      },
      {
        id: 'contacts',
        label: 'Есть контакт для действия',
        ok: Boolean(contacts.phone || contacts.telegram || contacts.website || contacts.instagram || contacts.vk),
        severity: 'warning',
        detail: 'Телефон, Telegram, сайт или соцсети нужны для конверсии.',
      },
      {
        id: 'premium',
        label: 'Premium заполнен аккуратно',
        ok: !premiumConfig.premiumActive || Boolean(premiumConfig.heroImage && premiumConfig.ctaText && premiumConfig.ctaUrl),
        severity: 'info',
        detail: premiumConfig.premiumActive
          ? 'Для premium лучше иметь hero image, CTA текст и ссылку.'
          : 'Premium выключен.',
      },
      {
        id: 'events',
        label: 'Есть события',
        ok: eventsCount > 0,
        severity: 'info',
        detail: eventsCount ? `${eventsCount} ближайших/актуальных событий.` : 'События повышают повод открыть карточку.',
      },
    ];

    return {
      score: Math.round((checks.filter((check) => check.ok).length / checks.length) * 100),
      checks,
    };
  }
}
