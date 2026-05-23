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
    return this.collectionRepository.find({
      order: { publishedAt: 'DESC' },
    });
  }

  async createOrUpdate(data: any) {
    const id = data.id || `c-${Math.random().toString(36).substring(2, 11)}`;
    let collection = await this.collectionRepository.findOne({ where: { id } });

    if (collection) {
      collection = this.collectionRepository.merge(collection, data);
    } else {
      collection = this.collectionRepository.create({
        ...data,
        id,
        publishedAt: new Date(),
      } as Partial<CollectionEntity>);
    }

    return this.collectionRepository.save(collection);
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
