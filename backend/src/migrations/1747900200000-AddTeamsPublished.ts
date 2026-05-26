import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamsPublished1747900200000 implements MigrationInterface {
  name = 'AddTeamsPublished1747900200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_formation_configs" ADD COLUMN IF NOT EXISTS "teams_published" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_formation_configs" DROP COLUMN IF EXISTS "teams_published"`,
    );
  }
}
