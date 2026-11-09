import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PasswordPendiente1794156151914 implements MigrationInterface {
  name = 'PasswordPendiente1794156151914';

  public async up(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE \"usuarios\" ADD \"debe_cambiar_password\" boolean NOT NULL DEFAULT false");
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE \"usuarios\" DROP COLUMN \"debe_cambiar_password\"");
  }
}
