import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { ActualizarNodoDto, CrearActaDto, CrearNodoDto, TrdDto } from './clasificacion.dto.js';
import { ClasificacionService } from './clasificacion.service.js';

@Controller('clasificacion')
export class ClasificacionController {
  constructor(private readonly svc: ClasificacionService) {}

  @Get('arbol') arbol() { return this.svc.arbol(); }
  @Get('series') series() { return this.svc.series(); }

  @Post() @Roles(Rol.ADMIN) crear(@Body() dto: CrearNodoDto) { return this.svc.crear(dto); }
  @Patch(':id') @Roles(Rol.ADMIN) actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarNodoDto) { return this.svc.actualizar(id, dto); }

  @Delete(':id') @Roles(Rol.ADMIN)
  async desactivar(@Param('id', ParseUUIDPipe) id: string) {
    await this.svc.desactivar(id);
    return { ok: true };
  }

  @Put(':id/trd') @Roles(Rol.ADMIN) trd(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TrdDto) { return this.svc.definirTrd(id, dto); }

  @Get('actas-valoracion') @Roles(Rol.ARCHIVISTA, Rol.CONSULTOR) actas() { return this.svc.listarActas(); }
  @Post('actas-valoracion') @Roles(Rol.ARCHIVISTA) crearActa(@Body() dto: CrearActaDto) { return this.svc.crearActa(dto); }
}
