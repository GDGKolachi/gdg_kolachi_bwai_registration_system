import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Team deposit confirmation. A selected team holds its seats only once the
 * captain deposits the fee, so the team carries the payment state rather than
 * each registration — the deposit is one payment for the whole roster.
 *
 * The timestamps are TIMESTAMPTZ rather than the TIMESTAMP used elsewhere in
 * this schema. A deadline is an absolute instant that a countdown is shown
 * against, so it cannot be stored naive: with a naive column, Postgres writes
 * it in the DB session's zone and Node reads it back in the process's zone, and
 * the two silently disagree the moment those differ. Verified concretely — a
 * 24-hour window read back as 34 hours with the DB on Asia/Karachi and Node on
 * America/Chicago. Audit-only timestamps elsewhere tolerate that; a deadline
 * shown to registrants does not.
 *
 * 'expired' is deliberately NOT a stored value. It is derived from
 * payment_status = 'requested' AND payment_deadline < now(), so a team cannot
 * sit in a stale 'expired' row because a cron did not run, and extending a
 * deadline un-expires a team with no extra write.
 */
export class TeamPaymentConfirmation1753800000000 implements MigrationInterface {
  name = 'TeamPaymentConfirmation1753800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // not_requested | requested | submitted | paid | rejected
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_status" character varying NOT NULL DEFAULT 'not_requested'`,
    );
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_requested_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_deadline" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_submitted_at" TIMESTAMPTZ`);

    // What the captain tells us they sent, for reconciling against the bank statement.
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_reference" character varying`);
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_sender_name" character varying`);
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_note" text`);

    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_confirmed_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_confirmed_by" uuid`);
    await queryRunner.query(`ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "payment_rejection_reason" text`);

    // The admin grid filters and sorts teams by where they are in this flow.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_teams_payment_status" ON "teams" ("payment_status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_teams_payment_status"`);
    for (const col of [
      'payment_rejection_reason',
      'payment_confirmed_by',
      'payment_confirmed_at',
      'payment_note',
      'payment_sender_name',
      'payment_reference',
      'payment_submitted_at',
      'payment_deadline',
      'payment_requested_at',
      'payment_status',
    ]) {
      await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "${col}"`);
    }
  }
}
