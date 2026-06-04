import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueSuggestionEntity } from '../entities/venue-suggestion.entity';
import { VenueSuggestionController } from './venue-suggestion.controller';
import { VenueSuggestionService } from './venue-suggestion.service';

@Module({
  imports: [TypeOrmModule.forFeature([VenueSuggestionEntity])],
  controllers: [VenueSuggestionController],
  providers: [VenueSuggestionService],
})
export class VenueSuggestionModule {}
