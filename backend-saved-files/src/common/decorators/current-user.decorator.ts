import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Rol } from '../enums/rol.enum.js';

export interface UsuarioAutenticado {
  id: string;
  username: string;
  rol: Rol;
  unidadId: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<{ user: UsuarioAutenticado }>().user,
);
