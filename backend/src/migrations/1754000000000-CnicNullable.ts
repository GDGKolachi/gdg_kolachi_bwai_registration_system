import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Online events no longer ask for a CNIC — it is only checked at the venue —
 * so an attendee whose registrations are all online has none on record.
 */
export class CnicNullable1754000000000 implements MigrationInterface {
  name = 'CnicNullable1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attendees" ALTER COLUMN "cnic" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Backfill first, otherwise restoring the constraint fails on any row
    // written while the column was nullable.
    await queryRunner.query(
      `UPDATE "attendees" SET "cnic" = '' WHERE "cnic" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendees" ALTER COLUMN "cnic" SET NOT NULL`,
    );
  }
}
