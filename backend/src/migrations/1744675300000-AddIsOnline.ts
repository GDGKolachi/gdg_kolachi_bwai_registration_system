import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsOnline1744675300000 implements MigrationInterface {
  name = 'AddIsOnline1744675300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workshops" ADD COLUMN IF NOT EXISTS "is_online" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workshops" DROP COLUMN IF EXISTS "is_online"`,
    );
  }
}
