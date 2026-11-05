import { Check, Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { DisposicionFinal, NivelClasificacion } from '../common/enums/archivo.enums.js';

/** Cuadro de Clasificación: una sola tabla jerárquica (Fondo > ... > Subserie). */
@Entity('nodos_clasificacion')
export class NodoClasificacion extends AuditableEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  codigo: string;

  @Column({ type: 'varchar', length: 200 })
  nombre: string;

  @Column({ type: 'enum', enum: NivelClasificacion, enumName: 'nivel_clasificacion' })
  nivel: NivelClasificacion;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'padre_id', type: 'uuid', nullable: true })
  padreId: string | null;

  @ManyToOne(() => NodoClasificacion, { nullable: true })
  @JoinColumn({ name: 'padre_id' })
  padre?: NodoClasificacion | null;

  trd?: TablaRetencion | null;
}

/** Tabla de Retención Documental: solo para Series y Subseries. */
@Entity('tabla_retencion')
@Check('chk_trd_anos', '"anos_archivo_gestion" >= 0 AND "anos_archivo_central" >= 0')
export class TablaRetencion extends AuditableEntity {
  @Index({ unique: true })
  @Column({ name: 'nodo_id', type: 'uuid' })
  nodoId: string;

  @OneToOne(() => NodoClasificacion)
  @JoinColumn({ name: 'nodo_id' })
  nodo?: NodoClasificacion;

  @Column({ name: 'anos_archivo_gestion', type: 'int' })
  anosArchivoGestion: number;

  @Column({ name: 'anos_archivo_central', type: 'int' })
  anosArchivoCentral: number;

  @Column({ name: 'disposicion_final', type: 'enum', enum: DisposicionFinal, enumName: 'disposicion_final' })
  disposicionFinal: DisposicionFinal;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;
}

/** Actas de la Comisión de Valoración Documental. */
@Entity('actas_valoracion')
export class ActaValoracion extends AuditableEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  numero: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ name: 'nodo_id', type: 'uuid' })
  nodoId: string;

  @ManyToOne(() => NodoClasificacion)
  @JoinColumn({ name: 'nodo_id' })
  nodo?: NodoClasificacion;

  @Column({ type: 'enum', enum: DisposicionFinal, enumName: 'disposicion_final' })
  disposicion: DisposicionFinal;

  @Column({ type: 'text' })
  descripcion: string;
}
