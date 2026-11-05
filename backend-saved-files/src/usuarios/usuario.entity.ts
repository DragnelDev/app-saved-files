import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { Rol } from '../common/enums/rol.enum.js';
import { Unidad } from '../unidades/unidad.entity.js';

@Entity('usuarios')
export class Usuario extends AuditableEntity {
  @Column({ type: 'varchar', length: 60, unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash: string;

  @Column({ name: 'nombre_completo', type: 'varchar', length: 150 })
  nombreCompleto: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email: string | null;

  @Column({ type: 'enum', enum: Rol, enumName: 'rol_usuario' })
  rol: Rol;

  @Column({ name: 'unidad_id', type: 'uuid', nullable: true })
  unidadId: string | null;

  @ManyToOne(() => Unidad, { nullable: true })
  @JoinColumn({ name: 'unidad_id' })
  unidad?: Unidad | null;
}
