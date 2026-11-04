import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../common/entities/auditable.entity.js';
import { Rol } from '../common/enums/rol.enum.js';

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

  /** Unidad organizacional (se enlazará con la tabla `unidades` al crearla). */
  @Column({ name: 'unidad_id', type: 'uuid', nullable: true })
  unidadId: string | null;
}
