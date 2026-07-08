import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CollectionEntity } from '../entities/collection.entity';
import { VenueEntity } from '../entities/venue.entity';
import { SaveCollectionDto } from './dto/save-collection.dto';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    @InjectRepository(VenueEntity)
    private readonly venueRepository: Repository<VenueEntity>,
  ) {}

  async findAll() {
    const collections = await this.collectionRepository.find({
      relations: ['venues'],
      order: { publishedAt: 'DESC' },
    });

    return collections.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      cover: c.cover,
      publishedAt: c.publishedAt,
      venueIds: c.venues ? c.venues.map((v) => v.id) : [],
    }));
  }

  async createOrUpdate(data: SaveCollectionDto) {
    const id = data.id || `c-${Math.random().toString(36).substring(2, 11)}`;
    let collection = await this.collectionRepository.findOne({
      where: { id },
      relations: ['venues'],
    });

    const requestedVenueIds = Array.from(new Set(data.venueIds || []));
    const venueEntities = requestedVenueIds.length
      ? await this.venueRepository.find({ where: { id: In(requestedVenueIds) } })
      : [];

    if (requestedVenueIds.length !== venueEntities.length) {
      throw new BadRequestException('One or more collection venues do not exist');
    }

    if (collection) {
      collection = this.collectionRepository.merge(collection, {
        ...data,
        venues: venueEntities,
      });
    } else {
      collection = this.collectionRepository.create({
        ...data,
        id,
        venues: venueEntities,
        publishedAt: new Date(),
      });
    }

    const saved = await this.collectionRepository.save(collection);

    const reloaded = await this.collectionRepository.findOne({
      where: { id: saved.id },
      relations: ['venues'],
    });

    return {
      id: reloaded.id,
      title: reloaded.title,
      description: reloaded.description,
      cover: reloaded.cover,
      publishedAt: reloaded.publishedAt,
      venueIds: reloaded.venues ? reloaded.venues.map((v) => v.id) : [],
    };
  }

  async delete(id: string) {
    const collection = await this.collectionRepository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException(`Collection with ID "${id}" not found`);
    }
    await this.collectionRepository.delete(id);
    return { success: true };
  }
}
