import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Online sessions: the meeting details that go in the emails, and the
 * automatic "starting soon" reminder (see src/online). The reminder is off by
 * default so existing online events do not start emailing on deploy.
 */
export class OnlineMeeting1754100000000 implements MigrationInterface {
  name = 'OnlineMeeting1754100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "meeting_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "meeting_details" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "meeting_reminder_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "meeting_reminder_minutes" integer NOT NULL DEFAULT 30`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "meeting_reminder_sent_at" TIMESTAMPTZ`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "meeting_reminder_sent_count" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of [
      'meeting_reminder_sent_count',
      'meeting_reminder_sent_at',
      'meeting_reminder_minutes',
      'meeting_reminder_enabled',
      'meeting_details',
      'meeting_url',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "events" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
  }
}
