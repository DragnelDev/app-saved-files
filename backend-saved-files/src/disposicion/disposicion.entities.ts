import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { DisposicionFinal, EstadoPropuesta, ResolucionItem } from '../common/enums/archivo.enums.js';
import { Expediente } from '../expedientes/expediente.entity.js';

/** Propuesta de disposición final presentada a la Comisión de Valoración Documental. */
@Entity('propuestas_disposicion')
export class PropuestaDisposicion extends AuditableEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  codigo: string;

  @Column({ type: 'enum', enum: DisposicionFinal, enumName: 'disposicion_final' })
  tipo: DisposicionFinal;

  @Column({ type: 'enum', enum: EstadoPropuesta, enumName: 'estado_propuesta', default: EstadoPropuesta.BORRADOR })
  estado: EstadoPropuesta;

  @Column({ type: 'text' })
  justificacion: string;

  /** Datos del acta de la Comisión que resuelve la propuesta. */
  @Index({ unique: true, where: '"acta_numero" IS NOT NULL' })
  @Column({ name: 'acta_numero', type: 'varchar', length: 40, nullable: true })
  actaNumero: string | null;

  @Column({ name: 'acta_fecha', type: 'date', nullable: true })
  actaFecha: string | null;

  @Column({ name: 'observaciones_comision', type: 'text', nullable: true })
  observacionesComision: string | null;

  @Column({ name: 'fecha_presentacion', type: 'timestamptz', nullable: true })
  fechaPresentacion: Date | null;

  @Column({ name: 'fecha_resolucion', type: 'timestamptz', nullable: true })
  fechaResolucion: Date | null;

  @Column({ name: 'fecha_ejecucion', type: 'timestamptz', nullable: true })
  fechaEjecucion: Date | null;

  @OneToMany(() => DetallePropuesta, (d) => d.propuesta)
  detalles?: DetallePropuesta[];
}

@Entity('detalle_propuesta_disposicion')
@Index(['propuestaId', 'expedienteId'], { unique: true })
export class DetallePropuesta extends AuditableEntity {
  @Column({ name: 'propuesta_id', type: 'uuid' })
  propuestaId: string;

  @ManyToOne(() => PropuestaDisposicion, (p) => p.detalles)
  @JoinColumn({ name: 'propuesta_id' })
  propuesta?: PropuestaDisposicion;

  @Column({ name: 'expediente_id', type: 'uuid' })
  expedienteId: string;

  @ManyToOne(() => Expediente)
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente;

  /** Solo se usa en selección / muestreo. */
  @Column({ type: 'enum', enum: ResolucionItem, enumName: 'resolucion_item', nullable: true })
  resolucion: ResolucionItem | null;
}
