import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Rol } from '../common/enums/rol.enum.js';
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
}
