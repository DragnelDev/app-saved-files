import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { CrearTransferenciaDto, FiltroTransferenciasDto, ObservarDto, ReemplazarExpedientesDto, VerificarItemDto } from './transferencias.dto.js';
import { TransferenciasService } from './transferencias.service.js';

@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly svc: TransferenciasService) {}

  @Get() listar(@Query() f: FiltroTransferenciasDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.listar(u, f.estado); }
  @Get(':id') obtener(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.obtenerConAdvertencias(id, u); }

  // --- Responsable de unidad (y archivista, a nombre de una unidad) ---
  @Post() @Roles(Rol.RESPONSABLE_UNIDAD, Rol.ARCHIVISTA)
  crear(@Body() dto: CrearTransferenciaDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.crear(dto, u); }

  @Put(':id/expedientes') @Roles(Rol.RESPONSABLE_UNIDAD, Rol.ARCHIVISTA)
  reemplazar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReemplazarExpedientesDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.reemplazarExpedientes(id, dto.expedienteIds, u); }

  @Post(':id/enviar') @Roles(Rol.RESPONSABLE_UNIDAD, Rol.ARCHIVISTA)
  enviar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.enviar(id, u); }

  @Delete(':id') @Roles(Rol.RESPONSABLE_UNIDAD, Rol.ARCHIVISTA)
  async eliminar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) {
    await this.svc.eliminarBorrador(id, u);
    return { ok: true };
  }

  // --- Archivista ---
  @Post(':id/iniciar-revision') @Roles(Rol.ARCHIVISTA)
  revisar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.iniciarRevision(id, u); }

  @Put(':id/detalle/:detalleId') @Roles(Rol.ARCHIVISTA)
  verificar(@Param('id', ParseUUIDPipe) id: string, @Param('detalleId', ParseUUIDPipe) detalleId: string, @Body() dto: VerificarItemDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.verificarItem(id, detalleId, dto, u); }

  @Post(':id/aprobar') @Roles(Rol.ARCHIVISTA)
  aprobar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.aprobar(id, u); }

  @Post(':id/observar') @Roles(Rol.ARCHIVISTA)
  observar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ObservarDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.observar(id, dto, u); }
}
