import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, StreamableFile } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { CrearCajaDto, CrearUbicacionDto } from './ubicaciones.dto.js';
import { UbicacionesService } from './ubicaciones.service.js';

@Controller()
export class UbicacionesController {
  constructor(private readonly svc: UbicacionesService) {}

  @Get('ubicaciones/arbol') @Roles(Rol.ARCHIVISTA, Rol.CONSULTOR) arbol() { return this.svc.arbol(); }
  @Post('ubicaciones') @Roles(Rol.ARCHIVISTA) crear(@Body() dto: CrearUbicacionDto) { return this.svc.crear(dto); }

  @Delete('ubicaciones/:id') @Roles(Rol.ARCHIVISTA)
  async desactivar(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.desactivar(id);
    return { ok: true };
  }

  @Get('cajas') @Roles(Rol.ARCHIVISTA, Rol.CONSULTOR) cajas(@Query('baldaId') baldaId?: string) { return this.svc.listarCajas(baldaId); }
  @Post('cajas') @Roles(Rol.ARCHIVISTA) crearCaja(@Body() dto: CrearCajaDto) { return this.svc.crearCaja(dto); }
  @Get('cajas/:id') @Roles(Rol.ARCHIVISTA, Rol.CONSULTOR) caja(@Param('id', ParseUUIDPipe) id: string) { return this.svc.detalleCaja(id); }

  @Get('cajas/:id/qr') @Roles(Rol.ARCHIVISTA, Rol.CONSULTOR)
  async qr(@Param('id', ParseUUIDPipe) id: string) {
    return new StreamableFile(await this.svc.qrCaja(id), { type: 'image/png' });
  }
}
