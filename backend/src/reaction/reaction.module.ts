import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionEntity } from '../entities/reaction.entity';
import { UserEntity } from '../entities/user.entity';
import { VenueEntity } from '../entities/venue.entity';
import { ReactionController } from './reaction.controller';
import { ReactionService } from './reaction.service';
import { VenueModule } from '../venue/venue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReactionEntity, UserEntity, VenueEntity]),
    VenueModule,
  ],
  controllers: [ReactionController],
  providers: [ReactionService],
  exports: [ReactionService],
})
export class ReactionModule {}
