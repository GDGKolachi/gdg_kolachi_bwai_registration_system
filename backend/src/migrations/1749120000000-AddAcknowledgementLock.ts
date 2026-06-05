import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcknowledgementLock1749120000000 implements MigrationInterface {
  name = 'AddAcknowledgementLock1749120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "acknowledgement_deadline" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "acknowledgement_locked" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "acknowledgement_expired" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registrations" DROP COLUMN IF EXISTS "acknowledgement_expired"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP COLUMN IF EXISTS "acknowledgement_locked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events" DROP COLUMN IF EXISTS "acknowledgement_deadline"`,
    );
  }
}
