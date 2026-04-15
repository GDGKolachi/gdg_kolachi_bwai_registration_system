import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowExceptions1744675200000 implements MigrationInterface {
  name = 'AddAllowExceptions1744675200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workshops" ADD COLUMN IF NOT EXISTS "allow_exceptions" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workshops" DROP COLUMN IF EXISTS "allow_exceptions"`,
    );
  }
}
