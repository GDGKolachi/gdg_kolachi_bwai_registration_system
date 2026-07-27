import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Registration.motivation has been `nullable: true` in the entity since
 * Community Lounge shipped — that path writes null explicitly — but the column
 * was created NOT NULL in InitialSchema and no migration ever altered it. With
 * `synchronize: false` the schema never caught up, so every Community Lounge
 * signup hits the constraint. Non-captain team members don't answer motivation
 * either, which is how it surfaced.
 *
 * This lives in its own migration rather than in 1753500000000-TeamRegistration
 * because that one is already recorded as applied in production; editing it
 * would mean the ALTER never runs there.
 */
export class MotivationNullable1753600000000 implements MigrationInterface {
  name = 'MotivationNullable1753600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registrations" ALTER COLUMN "motivation" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Backfill first, otherwise restoring the constraint fails on any row
    // written while the column was nullable.
    await queryRunner.query(
      `UPDATE "registrations" SET "motivation" = '' WHERE "motivation" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ALTER COLUMN "motivation" SET NOT NULL`,
    );
  }
}
