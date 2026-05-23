import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { VenueModule } from './venue/venue.module';
import { ReactionModule } from './reaction/reaction.module';
import { EventModule } from './event/event.module';
import { CollectionModule } from './collection/collection.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'db',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'yacheyka',
      autoLoadEntities: true,
      synchronize: true, // Auto schema sync for development
    }),
    DatabaseModule,
    VenueModule,
    ReactionModule,
    EventModule,
    CollectionModule,
    AnalyticsModule,
    StorageModule,
  ],
})
export class AppModule {}
