import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminRolesAndSoftDelete1753700000000 implements MigrationInterface {
  name = 'AdminRolesAndSoftDelete1753700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Admin roles ──────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "role" character varying NOT NULL DEFAULT 'organizer'`,
    );

    // Everyone who already had an account had unrestricted access, so promote
    // them rather than silently downgrading live users. New accounts default to
    // organizer via the column default above.
    await queryRunner.query(`UPDATE "admins" SET "role" = 'super_admin' WHERE "role" = 'organizer'`);

    // ── Registration soft delete ─────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "deleted_by" uuid`,
    );

    // Every list, count, capacity check and export filters on deleted_at IS NULL.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_registrations_deleted_at" ON "registrations" ("deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_registrations_deleted_at"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "deleted_by"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN IF EXISTS "role"`);
  }
}
