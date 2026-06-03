import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsEventEntity } from '../entities/analytics.entity';
import { EventEntity } from '../entities/event.entity';
import { ReactionEntity } from '../entities/reaction.entity';
import { UserEntity } from '../entities/user.entity';
import { VenueEntity } from '../entities/venue.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminDataController } from './admin-data.controller';
import { AdminDataService } from './admin-data.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      UserEntity,
      VenueEntity,
      EventEntity,
      ReactionEntity,
      AnalyticsEventEntity,
    ]),
  ],
  controllers: [AdminDataController],
  providers: [AdminDataService],
})
export class AdminDataModule {}
