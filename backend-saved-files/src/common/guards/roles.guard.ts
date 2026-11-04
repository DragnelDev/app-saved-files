import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { Rol } from '../enums/rol.enum.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requeridos?.length) return true;
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { rol: Rol } }>();
    // ROLE_ADMIN tiene control total
    return !!user && (user.rol === Rol.ADMIN || requeridos.includes(user.rol));
  }
}
