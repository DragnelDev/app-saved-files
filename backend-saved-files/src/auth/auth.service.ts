import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginLimiter } from './login-limiter.service.js';

// Hash de relleno: así tardar lo mismo con usuarios inexistentes evita revelar qué usuarios existen.
const HASH_FALSO = bcrypt.hashSync('relleno-no-valido', 12);

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly limiter: LoginLimiter,
  ) {}

  async login({ username, password }: LoginDto, ip: string) {
    const clave = `${ip}|${username.toLowerCase()}`;
    this.limiter.verificar(clave);
    const usuario = await this.usuarios.buscarParaLogin(username);
    const ok = await bcrypt.compare(password, usuario?.passwordHash ?? HASH_FALSO);
    if (!usuario || !ok) {
      this.limiter.fallo(clave);
      throw new UnauthorizedException('Credenciales inválidas');
    }
    this.limiter.exito(clave);
    const accessToken = await this.jwt.signAsync({ sub: usuario.id, username: usuario.username, rol: usuario.rol });
    return {
      accessToken,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombreCompleto: usuario.nombreCompleto,
        rol: usuario.rol,
        unidadId: usuario.unidadId,
        debeCambiarPassword: usuario.debeCambiarPassword,
      },
    };
  }

  async cambiarPassword(userId: string, actual: string, nueva: string, ip: string) {
    const clave = `pw|${ip}|${userId}`;
    this.limiter.verificar(clave);
    try {
      await this.usuarios.cambiarPropia(userId, actual, nueva);
    } catch (e) {
      this.limiter.fallo(clave);
      throw e;
    }
    this.limiter.exito(clave);
  }
}
