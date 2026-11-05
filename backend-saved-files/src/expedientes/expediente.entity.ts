import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { EstadoExpediente, EstadoFoliacion, Sensibilidad } from '../common/enums/archivo.enums.js';
import { NodoClasificacion } from '../clasificacion/clasificacion.entities.js';
import { CajaArchivo } from '../ubicaciones/ubicaciones.entities.js';
import { Unidad } from '../unidades/unidad.entity.js';

@Entity('expedientes')
@Index(['nodoId', 'gestion', 'correlativo'], { unique: true })
@Check('chk_exp_fojas', '"foja_fin" >= "foja_inicio"')
@Check('chk_exp_foja_min', '"foja_inicio" IS NULL OR "foja_inicio" >= 1')
@Check('chk_exp_fechas', '"fecha_fin" IS NULL OR "fecha_fin" >= "fecha_inicio"')
export class Expediente extends AuditableEntity {
  /** Código de Serie + Gestión + Correlativo, p. ej. 3.1.2/2026/0007 */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  codigo: string;

  @Column({ name: 'nodo_id', type: 'uuid' })
  nodoId: string;

  @ManyToOne(() => NodoClasificacion)
  @JoinColumn({ name: 'nodo_id' })
  nodo?: NodoClasificacion;

  @Column({ type: 'int' })
  gestion: number;

  @Column({ type: 'int' })
  correlativo: number;

  @Column({ type: 'text' })
  asunto: string;

  @Column({ name: 'unidad_productora_id', type: 'uuid' })
  unidadProductoraId: string;

  @ManyToOne(() => Unidad)
  @JoinColumn({ name: 'unidad_productora_id' })
  unidadProductora?: Unidad;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio: string;

  @Column({ name: 'fecha_fin', type: 'date', nullable: true })
  fechaFin: string | null;

  @Column({ name: 'foja_inicio', type: 'int', nullable: true })
  fojaInicio: number | null;

  @Column({ name: 'foja_fin', type: 'int', nullable: true })
  fojaFin: number | null;

  @Column({ name: 'estado_foliacion', type: 'enum', enum: EstadoFoliacion, enumName: 'estado_foliacion', default: EstadoFoliacion.SIN_FOLIAR })
  estadoFoliacion: EstadoFoliacion;

  @Column({ type: 'enum', enum: EstadoExpediente, enumName: 'estado_expediente', default: EstadoExpediente.EN_GESTION })
  estado: EstadoExpediente;

  @Column({ type: 'enum', enum: Sensibilidad, enumName: 'sensibilidad', default: Sensibilidad.PUBLICO })
  sensibilidad: Sensibilidad;

  @Column({ name: 'palabras_clave', type: 'text', array: true, default: () => "'{}'" })
  palabrasClave: string[];

  @Column({ name: 'caja_id', type: 'uuid', nullable: true })
  cajaId: string | null;

  @ManyToOne(() => CajaArchivo, { nullable: true })
  @JoinColumn({ name: 'caja_id' })
  caja?: CajaArchivo | null;

  /** Posición de la carpeta dentro de la caja. */
  @Column({ type: 'int', nullable: true })
  carpeta: number | null;

  @Column({ name: 'fecha_ingreso_archivo', type: 'date', nullable: true })
  fechaIngresoArchivo: string | null;

  /** Fecha en que se ejecutó la disposición final (baja o paso al Archivo Histórico). */
  @Column({ name: 'fecha_disposicion', type: 'date', nullable: true })
  fechaDisposicion: string | null;

  @OneToMany(() => DocumentoExpediente, (d) => d.expediente)
  documentos?: DocumentoExpediente[];
}

@Entity('documentos_expediente')
@Check('chk_doc_fojas', '"foja_fin" >= "foja_inicio" AND "foja_inicio" >= 1')
export class DocumentoExpediente extends AuditableEntity {
  @Index()
  @Column({ name: 'expediente_id', type: 'uuid' })
  expedienteId: string;

  @ManyToOne(() => Expediente, (e) => e.documentos)
  @JoinColumn({ name: 'expediente_id' })
  expediente?: Expediente;

  @Column({ type: 'varchar', length: 250 })
  titulo: string;

  @Column({ name: 'tipo_documento', type: 'varchar', length: 80, nullable: true })
  tipoDocumento: string | null;

  @Column({ name: 'fecha_documento', type: 'date', nullable: true })
  fechaDocumento: string | null;

  @Column({ type: 'int' })
  orden: number;

  @Column({ name: 'foja_inicio', type: 'int' })
  fojaInicio: number;

  @Column({ name: 'foja_fin', type: 'int' })
  fojaFin: number;

  @Column({ name: 'archivo_path', type: 'varchar', length: 400 })
  archivoPath: string;

  @Column({ name: 'nombre_original', type: 'varchar', length: 255 })
  nombreOriginal: string;

  @Column({ type: 'bigint', transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  tamano: number;

  /** SHA-256 calculado al momento de la carga. */
  @Column({ name: 'hash_sha256', type: 'char', length: 64 })
  hashSha256: string;
}
