import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserFeedback1784509200000 implements MigrationInterface {
  name = 'AddUserFeedback1784509200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_feedback" (
        "id" varchar NOT NULL,
        "kind" varchar NOT NULL,
        "message" text NOT NULL,
        "contact" varchar,
        "userId" varchar NOT NULL,
        "userName" varchar,
        "status" varchar NOT NULL DEFAULT 'new',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_feedback" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_user_feedback_kind" CHECK ("kind" IN ('idea', 'bug', 'other')),
        CONSTRAINT "CHK_user_feedback_status" CHECK ("status" IN ('new', 'reviewed', 'closed')),
        CONSTRAINT "FK_user_feedback_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_feedback_status_created" ON "user_feedback" ("status", "createdAt" DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_feedback"`);
  }
}
