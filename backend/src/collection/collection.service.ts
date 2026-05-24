import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionEntity } from '../entities/collection.entity';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
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

  async createOrUpdate(data: any) {
    const id = data.id || `c-${Math.random().toString(36).substring(2, 11)}`;
    let collection = await this.collectionRepository.findOne({
      where: { id },
      relations: ['venues'],
    });

    const venueEntities = data.venueIds
      ? data.venueIds.map((vId: string) => ({ id: vId }))
      : [];

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
      } as Partial<CollectionEntity>);
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
