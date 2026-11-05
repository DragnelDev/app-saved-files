import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { TipoUbicacion } from '../common/enums/archivo.enums.js';

/** Depósito > Estante > Cuerpo > Balda (tabla jerárquica). */
@Entity('ubicacion_topografica')
@Index(['padreId', 'codigo'], { unique: true })
@Check('chk_ubic_cap', '"capacidad_cajas" IS NULL OR "capacidad_cajas" > 0')
export class Ubicacion extends AuditableEntity {
  @Column({ type: 'enum', enum: TipoUbicacion, enumName: 'tipo_ubicacion' })
  tipo: TipoUbicacion;

  @Column({ type: 'varchar', length: 20 })
  codigo: string;

  @Column({ type: 'varchar', length: 120 })
  nombre: string;

  @Column({ name: 'padre_id', type: 'uuid', nullable: true })
  padreId: string | null;

  @ManyToOne(() => Ubicacion, { nullable: true })
  @JoinColumn({ name: 'padre_id' })
  padre?: Ubicacion | null;

  /** Solo para BALDA: cuántas cajas admite. */
  @Column({ name: 'capacidad_cajas', type: 'int', nullable: true })
  capacidadCajas: number | null;
}

@Entity('cajas_archivo')
export class CajaArchivo extends AuditableEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  codigo: string;

  @Column({ name: 'balda_id', type: 'uuid' })
  baldaId: string;

  @ManyToOne(() => Ubicacion)
  @JoinColumn({ name: 'balda_id' })
  balda?: Ubicacion;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion: string | null;

  @Column({ name: 'capacidad_carpetas', type: 'int', default: 20 })
  capacidadCarpetas: number;
}
