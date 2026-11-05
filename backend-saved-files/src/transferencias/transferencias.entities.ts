import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { EstadoTransferencia } from '../common/enums/archivo.enums.js';
import { Expediente } from '../expedientes/expediente.entity.js';
import { Unidad } from '../unidades/unidad.entity.js';

@Entity('transferencias')
export class Transferencia extends AuditableEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30 })
  codigo: string;

  @Column({ name: 'unidad_origen_id', type: 'uuid' })
  unidadOrigenId: string;

  @ManyToOne(() => Unidad)
  @JoinColumn({ name: 'unidad_origen_id' })
  unidadOrigen?: Unidad;

  @Column({ type: 'enum', enum: EstadoTransferencia, enumName: 'estado_transferencia', default: EstadoTransferencia.BORRADOR })
  estado: EstadoTransferencia;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'fecha_envio', type: 'timestamptz', nullable: true })
  fechaEnvio: Date | null;

  @Column({ name: 'fecha_recepcion', type: 'timestamptz', nullable: true })
  fechaRecepcion: Date | null;

  @OneToMany(() => DetalleTransferencia, (d) => d.transferencia)
  detalles?: DetalleTransferencia[];
}

@Entity('detalle_transferencia')
@Index(['transferenciaId', 'expedienteId'], { unique: true })
export class DetalleTransferencia extends AuditableEntity {
  @Column({ name: 'transferencia_id', type: 'uuid' })
  transferenciaId: string;

  @ManyToOne(() => Transferencia, (t) => t.detalles)
  @JoinColumn({ name: 'transferencia_id' })
  transferencia?: Transferencia;

  @Column({ name: 'expediente_id', type: 'uuid' })
  expedienteId: string;

  @ManyToOne(() => Expediente)
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente;

  /** Validación de recepción física contra el inventario: null = pendiente. */
  @Column({ type: 'boolean', nullable: true })
  recibido: boolean | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({ name: 'caja_id', type: 'uuid', nullable: true })
  cajaId: string | null;

  @Column({ type: 'int', nullable: true })
  carpeta: number | null;
}
