import { DataSource } from 'typeorm';
import { AdminUserEntity } from './entities/admin-user.entity';
import { AnalyticsEventEntity } from './entities/analytics.entity';
import { CollectionEntity } from './entities/collection.entity';
import { EventEntity } from './entities/event.entity';
import { EventAttendanceEntity } from './entities/event-attendance.entity';
import { ReactionEntity } from './entities/reaction.entity';
import { UserEntity } from './entities/user.entity';
import { VenueSuggestionEntity } from './entities/venue-suggestion.entity';
import { UserFeedbackEntity } from './entities/user-feedback.entity';
import { VenueEntity } from './entities/venue.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'yacheyka',
  entities: [
    AdminUserEntity,
    AnalyticsEventEntity,
    CollectionEntity,
    EventEntity,
    EventAttendanceEntity,
    ReactionEntity,
    UserEntity,
    VenueSuggestionEntity,
    UserFeedbackEntity,
    VenueEntity,
  ],
  migrations: [__dirname + '/migrations/*{.js,.ts}'],
  synchronize: false,
});
