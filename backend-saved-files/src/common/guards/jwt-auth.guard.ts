import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PERMITE_PASSWORD_PENDIENTE_KEY } from '../decorators/permitir-password-pendiente.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const destinos = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, destinos)) return true;

    if (!(await super.canActivate(context))) return false;

    // Contraseña temporal: hasta cambiarla solo se puede usar /auth/me y /auth/cambiar-password.
    const { user } = context.switchToHttp().getRequest<{ user?: { debeCambiarPassword?: boolean } }>();
    if (user?.debeCambiarPassword && !this.reflector.getAllAndOverride<boolean>(PERMITE_PASSWORD_PENDIENTE_KEY, destinos)) {
      throw new ForbiddenException({ message: 'Debes cambiar tu contraseña antes de continuar', codigo: 'CAMBIO_PASSWORD_REQUERIDO' });
    }
    return true;
  }
}
