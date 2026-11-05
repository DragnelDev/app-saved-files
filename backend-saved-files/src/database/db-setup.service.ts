import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Objetos de BD que TypeORM no gestiona: secuencias de códigos y protección de la bitácora. */
@Injectable()
export class DbSetupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DbSetupService.name);
  constructor(private readonly ds: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const seq of ['seq_caja', 'seq_transferencia', 'seq_prestamo', 'seq_propuesta']) {
      await this.ds.query(`CREATE SEQUENCE IF NOT EXISTS ${seq}`);
    }
    await this.ds.query(`
      CREATE OR REPLACE FUNCTION bitacora_inmutable() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'La bitácora de auditoría es inmutable (%).', TG_OP;
      END; $$ LANGUAGE plpgsql`);
    await this.ds.query(`DROP TRIGGER IF EXISTS trg_bitacora_inmutable ON bitacora_auditoria`);
    await this.ds.query(`
      CREATE TRIGGER trg_bitacora_inmutable
      BEFORE UPDATE OR DELETE ON bitacora_auditoria
      FOR EACH ROW EXECUTE FUNCTION bitacora_inmutable()`);
    await this.ds.query(`DROP TRIGGER IF EXISTS trg_bitacora_no_truncate ON bitacora_auditoria`);
    await this.ds.query(`
      CREATE TRIGGER trg_bitacora_no_truncate
      BEFORE TRUNCATE ON bitacora_auditoria
      FOR EACH STATEMENT EXECUTE FUNCTION bitacora_inmutable()`);
    this.logger.log('Secuencias y protección de bitácora listas.');
  }

  async siguiente(seq: 'seq_caja' | 'seq_transferencia' | 'seq_prestamo' | 'seq_propuesta'): Promise<number> {
    const r = await this.ds.query(`SELECT nextval('${seq}') AS n`);
    return Number(r[0].n);
  }
}
