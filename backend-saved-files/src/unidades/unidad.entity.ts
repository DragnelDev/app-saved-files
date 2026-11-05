import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';

@Entity('unidades')
export class Unidad extends AuditableEntity {
  @Column({ type: 'varchar', length: 30, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  sigla: string | null;
}
