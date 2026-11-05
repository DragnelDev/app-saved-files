import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Bitácora inmutable: un trigger de PostgreSQL impide UPDATE, DELETE y TRUNCATE. */
@Entity('bitacora_auditoria')
@Index(['tabla', 'registroId'])
export class Bitacora {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 80 })
  tabla: string;

  @Column({ name: 'registro_id', type: 'varchar', length: 64 })
  registroId: string;

  @Column({ type: 'varchar', length: 10 })
  accion: 'INSERT' | 'UPDATE';

  @Column({ name: 'usuario_id', type: 'uuid', nullable: true })
  usuarioId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  @Column({ name: 'datos_anteriores', type: 'jsonb', nullable: true })
  datosAnteriores: Record<string, unknown> | null;

  @Column({ name: 'datos_nuevos', type: 'jsonb', nullable: true })
  datosNuevos: Record<string, unknown> | null;
}
