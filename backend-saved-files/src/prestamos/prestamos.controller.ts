import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { DevolverPrestamoDto, EntregarPrestamoDto, FiltroPrestamosDto, RechazarPrestamoDto, SolicitarPrestamoDto } from './prestamos.dto.js';
import { PrestamosService } from './prestamos.service.js';

@Controller('prestamos')
export class PrestamosController {
  constructor(private readonly svc: PrestamosService) {}

  @Get() listar(@Query() f: FiltroPrestamosDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.listar(u, f.estado); }
  @Get(':id') obtener(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.obtener(id, u); }

  @Post() @Roles(Rol.RESPONSABLE_UNIDAD, Rol.ARCHIVISTA)
  solicitar(@Body() dto: SolicitarPrestamoDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.solicitar(dto, u); }

  @Post(':id/entregar') @Roles(Rol.ARCHIVISTA)
  entregar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EntregarPrestamoDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.entregar(id, dto, u); }

  @Post(':id/rechazar') @Roles(Rol.ARCHIVISTA)
  async rechazar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RechazarPrestamoDto, @CurrentUser() u: UsuarioAutenticado) {
    await this.svc.rechazar(id, dto.motivo, u);
    return { ok: true };
  }

  @Post(':id/devolver') @Roles(Rol.ARCHIVISTA)
  devolver(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DevolverPrestamoDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.devolver(id, dto, u); }
}
