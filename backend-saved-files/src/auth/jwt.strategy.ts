import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Rol } from '../common/enums/rol.enum.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';

interface JwtPayload {
  sub: string;
  username: string;
  rol: Rol;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usuarios: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /** Se revalida contra la BD: un usuario desactivado pierde acceso de inmediato. */
  async validate(payload: JwtPayload) {
    const usuario = await this.usuarios.buscarPorId(payload.sub);
    if (!usuario) throw new UnauthorizedException();
    return {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      unidadId: usuario.unidadId,
    };
  }
}
