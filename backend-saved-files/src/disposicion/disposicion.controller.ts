import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { CrearPropuestaDto, FiltroPropuestasDto, FiltroVencidosDto, ReemplazarExpedientesPropuestaDto, ResolverItemDto, ResolverPropuestaDto } from './disposicion.dto.js';
import { DisposicionService } from './disposicion.service.js';

@Controller('disposicion')
@Roles(Rol.ARCHIVISTA, Rol.CONSULTOR)
export class DisposicionController {
  constructor(private readonly svc: DisposicionService) {}

  @Get('vencidos') vencidos(@Query() f: FiltroVencidosDto) { return this.svc.vencidos(f.tipo); }
  @Get('propuestas') listar(@Query() f: FiltroPropuestasDto) { return this.svc.listar(f.estado); }
  @Get('propuestas/:id') obtener(@Param('id', ParseUUIDPipe) id: string) { return this.svc.obtener(id); }

  @Post('propuestas') @Roles(Rol.ARCHIVISTA) crear(@Body() dto: CrearPropuestaDto) { return this.svc.crear(dto); }

  @Put('propuestas/:id/expedientes') @Roles(Rol.ARCHIVISTA)
  reemplazar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReemplazarExpedientesPropuestaDto) { return this.svc.reemplazarExpedientes(id, dto.expedienteIds); }

  @Delete('propuestas/:id') @Roles(Rol.ARCHIVISTA)
  async eliminar(@Param('id', ParseUUIDPipe) id: string) { await this.svc.eliminarBorrador(id); return { ok: true }; }

  @Post('propuestas/:id/presentar') @Roles(Rol.ARCHIVISTA) presentar(@Param('id', ParseUUIDPipe) id: string) { return this.svc.presentar(id); }

  @Post('propuestas/:id/resolver') @Roles(Rol.ARCHIVISTA)
  resolver(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResolverPropuestaDto) { return this.svc.resolver(id, dto); }

  @Put('propuestas/:id/detalle/:detalleId') @Roles(Rol.ARCHIVISTA)
  item(@Param('id', ParseUUIDPipe) id: string, @Param('detalleId', ParseUUIDPipe) detalleId: string, @Body() dto: ResolverItemDto) { return this.svc.resolverItem(id, detalleId, dto.resolucion); }

  @Post('propuestas/:id/ejecutar') @Roles(Rol.ARCHIVISTA) ejecutar(@Param('id', ParseUUIDPipe) id: string) { return this.svc.ejecutar(id); }
}
