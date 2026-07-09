import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventAttendance1783641600000 implements MigrationInterface {
  name = 'AddEventAttendance1783641600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "event_attendance" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" varchar NOT NULL,
        "eventId" varchar NOT NULL,
        "venueId" varchar NOT NULL,
        "status" varchar NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_attendance" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_attendance_user_event" UNIQUE ("userId", "eventId"),
        CONSTRAINT "CHK_event_attendance_status" CHECK ("status" IN ('going', 'not_going')),
        CONSTRAINT "FK_event_attendance_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_attendance_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_attendance_venue" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_event_attendance_venue_status" ON "event_attendance" ("venueId", "status")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_attendance"`);
  }
}
