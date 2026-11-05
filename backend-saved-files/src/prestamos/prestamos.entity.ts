import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { EstadoPrestamo, TipoSolicitante } from '../common/enums/archivo.enums.js';
import { Expediente } from '../expedientes/expediente.entity.js';
import { Unidad } from '../unidades/unidad.entity.js';

/** Acta de préstamo: puede incluir varios expedientes (ver `DetallePrestamo`). */
@Entity('prestamos_documentales')
@Check('chk_prestamo_fechas', '"fecha_devolucion_prevista" IS NULL OR "fecha_devolucion_prevista" >= "fecha_prestamo"')
export class Prestamo extends AuditableEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  codigo: string;

  @Column({ name: 'tipo_solicitante', type: 'enum', enum: TipoSolicitante, enumName: 'tipo_solicitante' })
  tipoSolicitante: TipoSolicitante;

  @Column({ name: 'unidad_solicitante_id', type: 'uuid', nullable: true })
  unidadSolicitanteId: string | null;

  @ManyToOne(() => Unidad, { nullable: true })
  @JoinColumn({ name: 'unidad_solicitante_id' })
  unidadSolicitante?: Unidad | null;

  @Column({ name: 'solicitante_nombre', type: 'varchar', length: 150 })
  solicitanteNombre: string;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'enum', enum: EstadoPrestamo, enumName: 'estado_prestamo', default: EstadoPrestamo.SOLICITADO })
  estado: EstadoPrestamo;

  @Column({ name: 'fecha_solicitud', type: 'date', default: () => 'CURRENT_DATE' })
  fechaSolicitud: string;

  @Column({ name: 'fecha_prestamo', type: 'date', nullable: true })
  fechaPrestamo: string | null;

  @Column({ name: 'fecha_devolucion_prevista', type: 'date', nullable: true })
  fechaDevolucionPrevista: string | null;

  /** Fecha en que se devolvió el último expediente del acta. */
  @Column({ name: 'fecha_devolucion_real', type: 'date', nullable: true })
  fechaDevolucionReal: string | null;

  @Column({ name: 'observaciones_entrega', type: 'text', nullable: true })
  observacionesEntrega: string | null;

  @Column({ name: 'observaciones_devolucion', type: 'text', nullable: true })
  observacionesDevolucion: string | null;

  @Column({ name: 'autorizado_por_id', type: 'uuid', nullable: true })
  autorizadoPorId: string | null;

  @OneToMany(() => DetallePrestamo, (d) => d.prestamo)
  detalles?: DetallePrestamo[];
}

@Entity('detalle_prestamo')
@Index(['prestamoId', 'expedienteId'], { unique: true })
export class DetallePrestamo extends AuditableEntity {
  @Column({ name: 'prestamo_id', type: 'uuid' })
  prestamoId: string;

  @ManyToOne(() => Prestamo, (p) => p.detalles)
  @JoinColumn({ name: 'prestamo_id' })
  prestamo?: Prestamo;

  @Column({ name: 'expediente_id', type: 'uuid' })
  expedienteId: string;

  @ManyToOne(() => Expediente)
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente;

  /** Fojas entregadas (instantánea al momento del préstamo, base del acta). */
  @Column({ name: 'fojas_entregadas', type: 'int', nullable: true })
  fojasEntregadas: number | null;

  /** Devolución por expediente: permite devoluciones parciales. */
  @Column({ name: 'fecha_devolucion_real', type: 'date', nullable: true })
  fechaDevolucionReal: string | null;

  @Column({ name: 'observacion_devolucion', type: 'text', nullable: true })
  observacionDevolucion: string | null;
}
