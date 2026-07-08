import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1720000000000 implements MigrationInterface {
  name = 'InitialSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "venues" (
        "id" varchar NOT NULL,
        "name" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "category" varchar NOT NULL,
        "shortDescription" text NOT NULL,
        "fullDescription" text NOT NULL,
        "address" varchar NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "workingHours" varchar NOT NULL,
        "workingHoursSchedule" jsonb,
        "logoUrl" text,
        "contacts" jsonb NOT NULL,
        "gallery" text array NOT NULL DEFAULT '{}',
        "tags" text array NOT NULL DEFAULT '{}',
        "status" varchar NOT NULL DEFAULT 'published',
        "premiumConfig" jsonb NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venues_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_venues_slug_unique" ON "venues" ("slug")');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar NOT NULL,
        "provider" varchar NOT NULL DEFAULT 'telegram',
        "providerUserId" varchar,
        "telegramId" varchar,
        "username" varchar NOT NULL,
        "firstName" varchar NOT NULL,
        "lastName" varchar,
        "avatarUrl" varchar,
        "email" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_telegram_id_unique" ON "users" ("telegramId") WHERE "telegramId" IS NOT NULL');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_username_unique" ON "users" ("username")');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_provider_provider_user_id_unique" ON "users" ("provider", "providerUserId") WHERE "providerUserId" IS NOT NULL');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar NOT NULL,
        "passwordHash" varchar NOT NULL,
        "role" varchar NOT NULL DEFAULT 'editor',
        "status" varchar NOT NULL DEFAULT 'active',
        "lastLoginAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_users_email_unique" ON "admin_users" ("email")');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" varchar NOT NULL,
        "venueId" varchar NOT NULL,
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "date" varchar NOT NULL,
        "time" varchar NOT NULL,
        "coverImage" varchar,
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reactions" (
        "id" varchar NOT NULL,
        "userId" varchar NOT NULL,
        "venueId" varchar NOT NULL,
        "type" varchar NOT NULL,
        "vibeTag" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reactions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_reactions_user_venue_type_vibe_unique" ON "reactions" ("userId", "venueId", "type", "vibeTag")');
    await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS "IDX_reactions_user_venue_type_no_vibe_unique" ON "reactions" ("userId", "venueId", "type") WHERE "vibeTag" IS NULL');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "collections" (
        "id" varchar NOT NULL,
        "title" varchar NOT NULL,
        "description" text NOT NULL,
        "cover" varchar NOT NULL,
        "publishedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_collections_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "collection_venues" (
        "collectionId" varchar NOT NULL,
        "venueId" varchar NOT NULL,
        CONSTRAINT "PK_collection_venues" PRIMARY KEY ("collectionId", "venueId")
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_collection_venues_collection_id" ON "collection_venues" ("collectionId")');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_collection_venues_venue_id" ON "collection_venues" ("venueId")');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "analytics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventType" varchar NOT NULL,
        "venueId" varchar,
        "userId" varchar,
        "timestamp" timestamp NOT NULL DEFAULT now(),
        "metadata" jsonb,
        CONSTRAINT "PK_analytics_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_analytics_timestamp" ON "analytics" ("timestamp")');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "venue_suggestions" (
        "id" varchar NOT NULL,
        "name" varchar NOT NULL,
        "address" varchar NOT NULL,
        "comment" text,
        "contact" text,
        "userId" varchar,
        "userName" varchar,
        "status" varchar NOT NULL DEFAULT 'new',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_venue_suggestions_id" PRIMARY KEY ("id")
      )
    `);

    await this.addForeignKeyIfMissing(queryRunner, 'FK_events_venueId', 'events', '"venueId"', 'venues', '"id"');
    await this.addForeignKeyIfMissing(queryRunner, 'FK_reactions_userId', 'reactions', '"userId"', 'users', '"id"');
    await this.addForeignKeyIfMissing(queryRunner, 'FK_reactions_venueId', 'reactions', '"venueId"', 'venues', '"id"');
    await this.addForeignKeyIfMissing(queryRunner, 'FK_collection_venues_collectionId', 'collection_venues', '"collectionId"', 'collections', '"id"');
    await this.addForeignKeyIfMissing(queryRunner, 'FK_collection_venues_venueId', 'collection_venues', '"venueId"', 'venues', '"id"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "venue_suggestions"');
    await queryRunner.query('DROP TABLE IF EXISTS "analytics"');
    await queryRunner.query('DROP TABLE IF EXISTS "collection_venues"');
    await queryRunner.query('DROP TABLE IF EXISTS "collections"');
    await queryRunner.query('DROP TABLE IF EXISTS "reactions"');
    await queryRunner.query('DROP TABLE IF EXISTS "events"');
    await queryRunner.query('DROP TABLE IF EXISTS "admin_users"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
    await queryRunner.query('DROP TABLE IF EXISTS "venues"');
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    constraintName: string,
    tableName: string,
    sourceColumn: string,
    targetTableName: string,
    targetColumn: string,
  ) {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = '${constraintName}'
        ) THEN
          ALTER TABLE "${tableName}"
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY (${sourceColumn}) REFERENCES "${targetTableName}"(${targetColumn}) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  }
}
