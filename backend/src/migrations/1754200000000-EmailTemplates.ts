import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Configurable emails: a global theme setting (DevFest 2026 by default), an
 * optional per-event theme override, and per-type copy overrides. Empty
 * tables mean "built-in defaults", so nothing needs seeding.
 */
export class EmailTemplates1754200000000 implements MigrationInterface {
  name = 'EmailTemplates1754200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_settings" (
        "key" character varying(64) NOT NULL,
        "value" text NOT NULL,
        "updated_by" uuid,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_settings" PRIMARY KEY ("key")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "email_templates" (
        "email_type" character varying(64) NOT NULL,
        "subject" text,
        "heading" text,
        "intro" text,
        "cta_label" text,
        "updated_by" uuid,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_templates" PRIMARY KEY ("email_type")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "email_theme" character varying(64)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" DROP COLUMN IF EXISTS "email_theme"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "email_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_settings"`);
  }
}
