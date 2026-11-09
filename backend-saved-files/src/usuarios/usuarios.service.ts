import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Rol } from '../common/enums/rol.enum.js';
import { actualizar } from '../common/util/actualizar.js';
import { ActualizarUsuarioDto, CrearUsuarioDto } from './usuarios.dto.js';
import { Usuario } from './usuario.entity.js';

@Injectable()
export class UsuariosService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    @InjectRepository(Usuario) private readonly repo: Repository<Usuario>,
    private readonly config: ConfigService,
  ) {}

  /** Crea el administrador inicial si todavía no existe ningún usuario. */
  async onApplicationBootstrap(): Promise<void> {
    if ((await this.repo.count()) > 0) return;
    const username = this.config.get<string>('ADMIN_USERNAME', 'admin');
    const password = this.config.getOrThrow<string>('ADMIN_PASSWORD');
    await this.repo.save(
      this.repo.create({
        username,
        passwordHash: await bcrypt.hash(password, 12),
        nombreCompleto: this.config.get('ADMIN_NOMBRE', 'Administrador'),
        rol: Rol.ADMIN,
        debeCambiarPassword: true,
      }),
    );
    this.logger.warn(`Usuario administrador inicial "${username}" creado.`);
  }

  /** Incluye password_hash (columna `select: false`) solo para autenticar. */
  buscarParaLogin(username: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.username = :username AND u.activo = true', { username })
      .getOne();
  }

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.repo.findOneBy({ id, activo: true });
  }

  listar(): Promise<Usuario[]> {
    return this.repo.find({ where: { activo: true }, relations: { unidad: true }, order: { username: 'ASC' } });
  }

  private validarRolUnidad(rol: Rol, unidadId?: string | null) {
    if (rol === Rol.RESPONSABLE_UNIDAD && !unidadId) {
      throw new BadRequestException('El responsable de unidad debe tener una unidad asignada');
    }
  }

  async crear(dto: CrearUsuarioDto): Promise<Usuario> {
    this.validarRolUnidad(dto.rol, dto.unidadId);
    if (await this.repo.existsBy({ username: dto.username })) throw new ConflictException('El nombre de usuario ya existe');
    const { password, ...resto } = dto;
    const u = await this.repo.save(this.repo.create({ ...resto, passwordHash: await bcrypt.hash(password, 12), debeCambiarPassword: true }));
    return this.buscarPorId(u.id) as Promise<Usuario>;
  }

  async actualizar(id: string, dto: ActualizarUsuarioDto): Promise<Usuario> {
    const u = await this.buscarPorId(id);
    if (!u) throw new NotFoundException('Usuario no encontrado');
    const rol = dto.rol ?? u.rol;
    const unidadId = dto.unidadId !== undefined ? dto.unidadId : u.unidadId;
    this.validarRolUnidad(rol, unidadId);
    delete u.unidad;
    Object.assign(u, dto);
    await this.repo.save(u);
    return this.buscarPorId(id) as Promise<Usuario>;
  }

  /** Restablecimiento por el administrador: la contraseña queda como temporal. */
  async cambiarPassword(id: string, password: string): Promise<void> {
    const n = await actualizar(this.repo.manager, Usuario, { id, activo: true }, { passwordHash: await bcrypt.hash(password, 12), debeCambiarPassword: true });
    if (!n) throw new NotFoundException('Usuario no encontrado');
  }

  /** Cambio de contraseña por el propio usuario (exige la actual). */
  async cambiarPropia(id: string, actual: string, nueva: string): Promise<void> {
    const u = await this.repo.createQueryBuilder('u').addSelect('u.passwordHash').where('u.id = :id AND u.activo = true', { id }).getOne();
    // 400 y no 401: un 401 haría que el navegador cierre la sesión.
    if (!u || !(await bcrypt.compare(actual, u.passwordHash))) throw new BadRequestException('La contraseña actual no es correcta');
    if (actual === nueva) throw new BadRequestException('La nueva contraseña debe ser distinta de la actual');
    await actualizar(this.repo.manager, Usuario, u.id, { passwordHash: await bcrypt.hash(nueva, 12), debeCambiarPassword: false });
  }

  async desactivar(id: string, solicitanteId: string): Promise<void> {
    if (id === solicitanteId) throw new BadRequestException('No puedes desactivar tu propio usuario');
    const n = await actualizar(this.repo.manager, Usuario, { id, activo: true }, { activo: false });
    if (!n) throw new NotFoundException('Usuario no encontrado');
  }
}
