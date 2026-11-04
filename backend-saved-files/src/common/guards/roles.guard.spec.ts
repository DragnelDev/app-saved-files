import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '../enums/rol.enum.js';
import { RolesGuard } from './roles.guard.js';

function ctx(rol?: Rol): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: rol && { rol } }) }),
  } as unknown as ExecutionContext;
}

function guardCon(requeridos?: Rol[]) {
  const reflector = {
    getAllAndOverride: () => requeridos,
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('permite si la ruta no exige roles', () => {
    expect(guardCon().canActivate(ctx(Rol.CONSULTOR))).toBe(true);
  });

  it('permite el rol requerido y bloquea otros', () => {
    const guard = guardCon([Rol.ARCHIVISTA]);
    expect(guard.canActivate(ctx(Rol.ARCHIVISTA))).toBe(true);
    expect(guard.canActivate(ctx(Rol.CONSULTOR))).toBe(false);
    expect(guard.canActivate(ctx())).toBe(false);
  });

  it('ADMIN accede siempre', () => {
    expect(guardCon([Rol.ARCHIVISTA]).canActivate(ctx(Rol.ADMIN))).toBe(true);
  });
});
