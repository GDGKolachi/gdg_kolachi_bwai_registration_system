import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialInstructions1712448000000 implements MigrationInterface {
  name = 'AddSpecialInstructions1712448000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workshops" ADD COLUMN IF NOT EXISTS "special_instructions" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workshops" DROP COLUMN IF EXISTS "special_instructions"`,
    );
  }
}
