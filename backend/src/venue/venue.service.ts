import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { VenueEntity } from '../entities/venue.entity';

const transliterationMap: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

const makeSlug = (value: string) => {
  const transliterated = value
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => transliterationMap[char] ?? char)
    .join('');

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

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
    includeNonPublished?: boolean;
  }) {
    const qb = this.venueRepository.createQueryBuilder('venue')
      .leftJoinAndSelect('venue.reactions', 'reaction');

    if (!filters.includeNonPublished) {
      qb.andWhere('venue.status = :status', { status: 'published' });
    }

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

  async findOne(id: string, options: { includeNonPublished?: boolean } = {}) {
    const venue = await this.venueRepository.findOne({
      where: options.includeNonPublished ? { id } : { id, status: 'published' },
      relations: ['reactions', 'events'],
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID "${id}" not found`);
    }

    return this.mapVenueMetrics(venue);
  }

  async createOrUpdate(data: any) {
    const id = data.id || `v-${Math.random().toString(36).substring(2, 11)}`;
    const normalizedName = data.name?.trim().toLowerCase();
    const existingName = normalizedName
      ? await this.venueRepository
          .createQueryBuilder('venue')
          .where('LOWER(venue.name) = :name', { name: normalizedName })
          .andWhere(data.id ? 'venue.id != :id' : '1=1', { id: data.id })
          .getOne()
      : null;

    if (existingName) {
      throw new ConflictException('Venue name already exists');
    }

    const slug = makeSlug(data.slug || data.name || id) || id;
    const existingSlug = await this.venueRepository.findOne({
      where: data.id ? { slug, id: Not(data.id) } : { slug },
    });

    if (existingSlug) {
      throw new ConflictException('Venue slug already exists');
    }

    const premiumConfig = {
      ...(data.premiumConfig || {}),
      topItems: data.premiumConfig?.topItems || data.premiumConfig?.featuredDrinks || [],
      featuredDrinks: data.premiumConfig?.featuredDrinks || data.premiumConfig?.topItems || [],
      premiumTheme: undefined,
    };

    let venue = await this.venueRepository.findOne({ where: { id } });

    if (venue) {
      // Update
      venue = this.venueRepository.merge(venue, {
        ...data,
        slug,
        premiumConfig,
        updatedAt: new Date(),
      });
    } else {
      // Create new
      venue = this.venueRepository.create({
        ...data,
        id,
        slug,
        premiumConfig,
        likesCount: 0,
        notMyPlaceCount: 0,
        vibeRatings: {},
      } as Partial<VenueEntity>);
    }

    const saved = await this.venueRepository.save(venue);
    // Reload with relations to return mapped response for admin saves, including drafts.
    return this.findOne(saved.id, { includeNonPublished: true });
  }

  async delete(id: string) {
    const venue = await this.findOne(id, { includeNonPublished: true });
    await this.venueRepository.delete(id);
    return { success: true };
  }
}
