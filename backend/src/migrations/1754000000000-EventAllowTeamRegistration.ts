import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Moves the "allow team registration" switch from team_formation_configs to the
 * event itself, so it is chosen when the hackathon is created. New events
 * default to individual-only. Existing hackathons keep today's behaviour: teams
 * were allowed unless an admin had switched them off in the team config.
 */
export class EventAllowTeamRegistration1754000000000 implements MigrationInterface {
  name = 'EventAllowTeamRegistration1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "allow_team_registration" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`
      UPDATE "events" e
      SET "allow_team_registration" = true
      FROM "event_types" t
      WHERE t.id = e.event_type_id
        AND t.slug = 'hackathon'
        AND COALESCE(
          (SELECT c.allow_self_registered_teams FROM "team_formation_configs" c WHERE c.event_id = e.id),
          true
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "allow_team_registration"`);
  }
}
