import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { VenueEntity } from '../entities/venue.entity';
import { EventEntity } from '../entities/event.entity';
import { EventAttendanceEntity } from '../entities/event-attendance.entity';
import { CollectionEntity } from '../entities/collection.entity';
import { ReactionEntity } from '../entities/reaction.entity';
import { AnalyticsEventEntity } from '../entities/analytics.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      VenueEntity,
      EventEntity,
      EventAttendanceEntity,
      CollectionEntity,
      ReactionEntity,
      AnalyticsEventEntity,
    ]),
  ],
  providers: [SeedService],
  exports: [TypeOrmModule, SeedService],
})
export class DatabaseModule {}
