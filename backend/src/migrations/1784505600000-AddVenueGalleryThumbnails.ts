import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVenueGalleryThumbnails1784505600000 implements MigrationInterface {
  name = 'AddVenueGalleryThumbnails1784505600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "galleryThumbnails" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "venues" DROP COLUMN IF EXISTS "galleryThumbnails"`);
  }
}
