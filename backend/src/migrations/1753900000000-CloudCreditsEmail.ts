import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Google Cloud credits email (see docs/cloud-credits.md).
 *
 * Three per-event settings, plus one row per registration that tracks the
 * email send and the attendee's self-reported redemption. The UNIQUE
 * constraint on registration_id is what makes queueing idempotent.
 *
 * All timestamps are TIMESTAMPTZ (see the TeamPaymentConfirmation migration).
 */
export class CloudCreditsEmail1753900000000 implements MigrationInterface {
  name = 'CloudCreditsEmail1753900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "credits_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "credits_claim_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "credits_video_url" character varying`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "credit_redemptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "registration_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "token" character varying(64) NOT NULL,
        "source" character varying NOT NULL,
        "created_by_admin_id" uuid,
        "email_status" character varying NOT NULL DEFAULT 'pending',
        "email_attempts" integer NOT NULL DEFAULT 0,
        "email_generation" integer NOT NULL DEFAULT 1,
        "email_next_attempt_at" TIMESTAMPTZ,
        "email_queued_at" TIMESTAMPTZ,
        "email_sent_at" TIMESTAMPTZ,
        "email_last_error" text,
        "confirm_page_opened_at" TIMESTAMPTZ,
        "claim_clicked_at" TIMESTAMPTZ,
        "video_clicked_at" TIMESTAMPTZ,
        "redeemed_at" TIMESTAMPTZ,
        "redeemed_via" character varying,
        "redeemed_by_admin_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_credit_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_credit_redemptions_registration" UNIQUE ("registration_id"),
        CONSTRAINT "UQ_credit_redemptions_token" UNIQUE ("token"),
        CONSTRAINT "FK_credit_redemptions_registration" FOREIGN KEY ("registration_id")
          REFERENCES "registrations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_credit_redemptions_event" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_credit_redemptions_event" ON "credit_redemptions" ("event_id")`,
    );
    // The sender polls for due pending rows every second.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_credit_redemptions_due" ON "credit_redemptions" ("email_status", "email_next_attempt_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "credit_redemptions"`);
    for (const col of [
      'credits_video_url',
      'credits_claim_url',
      'credits_enabled',
    ]) {
      await queryRunner.query(
        `ALTER TABLE "events" DROP COLUMN IF EXISTS "${col}"`,
      );
    }
  }
}
