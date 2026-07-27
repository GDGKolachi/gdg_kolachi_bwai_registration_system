import { MigrationInterface, QueryRunner } from 'typeorm';

export class TeamRegistration1753500000000 implements MigrationInterface {
  name = 'TeamRegistration1753500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Registrations — individual shortlisting answers. All nullable: non-captain
    // team members answer the light set (skills only).
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "registration_mode" character varying NOT NULL DEFAULT 'individual'`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "is_captain" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "years_experience" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "prior_hackathons" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "skills" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "ai_experience" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "portfolio_url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "best_project" text`,
    );

    // Teams — registration-time origin and team-level answers.
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "origin" character varying NOT NULL DEFAULT 'auto'`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "captain_registration_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "has_idea" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "idea_description" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "worked_together_before" character varying`,
    );

    // Team formation config — team-registration rules.
    await queryRunner.query(
      `ALTER TABLE "team_formation_configs" ADD COLUMN IF NOT EXISTS "min_team_size" integer NOT NULL DEFAULT 2`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_formation_configs" ADD COLUMN IF NOT EXISTS "allow_self_registered_teams" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_formation_configs" ADD COLUMN IF NOT EXISTS "allow_team_topup" boolean NOT NULL DEFAULT false`,
    );

    // Pre-existing drift: Registration.motivation has been `nullable: true` in
    // the entity since Community Lounge landed (it writes null), but the column
    // was created NOT NULL in InitialSchema and no migration ever altered it.
    // Non-captain team members don't answer motivation either, so fix it here.
    await queryRunner.query(
      `ALTER TABLE "registrations" ALTER COLUMN "motivation" DROP NOT NULL`,
    );

    // Lookup indexes for the admin registrations viewer filters.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_registrations_registration_mode" ON "registrations" ("registration_mode")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_teams_origin" ON "teams" ("origin")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_teams_origin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_registrations_registration_mode"`);

    // Backfill before restoring the constraint, otherwise the revert fails on
    // any row written while motivation was nullable.
    await queryRunner.query(`UPDATE "registrations" SET "motivation" = '' WHERE "motivation" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "registrations" ALTER COLUMN "motivation" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "team_formation_configs" DROP COLUMN IF EXISTS "allow_team_topup"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_formation_configs" DROP COLUMN IF EXISTS "allow_self_registered_teams"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_formation_configs" DROP COLUMN IF EXISTS "min_team_size"`,
    );

    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "worked_together_before"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "idea_description"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "has_idea"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "captain_registration_id"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "origin"`);

    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "best_project"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "portfolio_url"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "ai_experience"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "skills"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "prior_hackathons"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "years_experience"`);
    await queryRunner.query(`ALTER TABLE "registrations" DROP COLUMN IF EXISTS "is_captain"`);
    await queryRunner.query(
      `ALTER TABLE "registrations" DROP COLUMN IF EXISTS "registration_mode"`,
    );
  }
}
