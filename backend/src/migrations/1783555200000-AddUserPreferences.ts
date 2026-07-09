import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferences1783555200000 implements MigrationInterface {
  name = 'AddUserPreferences1783555200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "preferences" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "preferences"`);
  }
}
