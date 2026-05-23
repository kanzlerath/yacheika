import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VenueEntity } from '../entities/venue.entity';
import { ReactionEntity } from '../entities/reaction.entity';

@Injectable()
export class VenueService {
  constructor(
    @InjectRepository(VenueEntity)
    private readonly venueRepository: Repository<VenueEntity>,
  ) {}

  private mapVenueMetrics(venue: VenueEntity) {
    const reactions = venue.reactions || [];
    const likesCount = reactions.filter((r) => r.type === 'like').length;
    const notMyPlaceCount = reactions.filter((r) => r.type === 'not_my_place').length;
    const vibeRatings: Record<string, number> = {};
    
    reactions
      .filter((r) => r.type === 'vibe_tag' && r.vibeTag)
      .forEach((r) => {
        vibeRatings[r.vibeTag] = (vibeRatings[r.vibeTag] || 0) + 1;
      });

    // Remove the raw reactions array from response payload
    const { reactions: _, ...venueData } = venue;

    return {
      ...venueData,
      likesCount,
      notMyPlaceCount,
      vibeRatings,
    };
  }

  async findAll(filters: {
    category?: string;
    tag?: string;
    search?: string;
    userLat?: number;
    userLng?: number;
  }) {
    const qb = this.venueRepository.createQueryBuilder('venue')
      .leftJoinAndSelect('venue.reactions', 'reaction');

    if (filters.category) {
      qb.andWhere('venue.category = :category', { category: filters.category });
    }

    if (filters.tag) {
      qb.andWhere(':tag = ANY(venue.tags)', { tag: filters.tag });
    }

    if (filters.search) {
      const searchLower = `%${filters.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(venue.name) LIKE :search OR LOWER(venue.shortDescription) LIKE :search OR :searchRaw = ANY(venue.tags))',
        { search: searchLower, searchRaw: filters.search },
      );
    }

    if (filters.userLat && filters.userLng) {
      qb.addSelect(
        'ST_Distance(ST_SetSRID(ST_MakePoint(venue.longitude, venue.latitude), 4326)::geography, ST_SetSRID(ST_MakePoint(:userLng, :userLat), 4326)::geography)',
        'distance',
      );
      qb.setParameter('userLat', filters.userLat);
      qb.setParameter('userLng', filters.userLng);
      qb.orderBy('distance', 'ASC');
    } else {
      qb.orderBy('venue.createdAt', 'DESC');
    }

    const venues = await qb.getMany();
    return venues.map((v) => this.mapVenueMetrics(v));
  }

  async findOne(id: string) {
    const venue = await this.venueRepository.findOne({
      where: { id },
      relations: ['reactions', 'events'],
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID "${id}" not found`);
    }

    return this.mapVenueMetrics(venue);
  }

  async createOrUpdate(data: any) {
    const id = data.id || `v-${Math.random().toString(36).substring(2, 11)}`;
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    let venue = await this.venueRepository.findOne({ where: { id } });

    if (venue) {
      // Update
      venue = this.venueRepository.merge(venue, {
        ...data,
        slug,
        updatedAt: new Date(),
      });
    } else {
      // Create new
      venue = this.venueRepository.create({
        ...data,
        id,
        slug,
        likesCount: 0,
        notMyPlaceCount: 0,
        vibeRatings: {},
      } as Partial<VenueEntity>);
    }

    const saved = await this.venueRepository.save(venue);
    // Reload with relations to return mapped response
    return this.findOne(saved.id);
  }

  async delete(id: string) {
    const venue = await this.findOne(id);
    await this.venueRepository.delete(id);
    return { success: true };
  }
}
