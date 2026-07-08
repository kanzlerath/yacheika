import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionEntity } from '../entities/collection.entity';
import { VenueEntity } from '../entities/venue.entity';
import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';

@Module({
  imports: [TypeOrmModule.forFeature([CollectionEntity, VenueEntity])],
  controllers: [CollectionController],
  providers: [CollectionService],
  exports: [CollectionService],
})
export class CollectionModule {}
