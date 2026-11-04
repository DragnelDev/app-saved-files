import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
  ) {}

  async login({ username, password }: LoginDto) {
    const usuario = await this.usuarios.buscarParaLogin(username);
    const ok = usuario && (await bcrypt.compare(password, usuario.passwordHash));
    if (!usuario || !ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const accessToken = await this.jwt.signAsync({
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    });
    return {
      accessToken,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombreCompleto: usuario.nombreCompleto,
        rol: usuario.rol,
        unidadId: usuario.unidadId,
      },
    };
  }
}
