import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAmbassador1747900100000 implements MigrationInterface {
  name = 'AddAmbassador1747900100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "ambassador" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "registrations" DROP COLUMN IF EXISTS "ambassador"`,
    );
  }
}
