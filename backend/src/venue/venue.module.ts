import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueEntity } from '../entities/venue.entity';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';

@Module({
  imports: [TypeOrmModule.forFeature([VenueEntity])],
  controllers: [VenueController],
  providers: [VenueService],
  exports: [VenueService],
})
export class VenueModule {}
