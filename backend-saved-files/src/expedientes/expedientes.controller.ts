import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { ActualizarExpedienteDto, CrearDocumentoDto, CrearExpedienteDto, FiltroExpedientesDto } from './expedientes.dto.js';
import { ExpedientesService } from './expedientes.service.js';

const ESCRIBEN = [Rol.ARCHIVISTA, Rol.RESPONSABLE_UNIDAD] as const;

@Controller()
export class ExpedientesController {
  constructor(private readonly svc: ExpedientesService) {}

  @Get('expedientes') listar(@Query() f: FiltroExpedientesDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.listar(f, u); }
  @Get('expedientes/:id') obtener(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.obtener(id, u); }

  @Post('expedientes') @Roles(...ESCRIBEN)
  crear(@Body() dto: CrearExpedienteDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.crear(dto, u); }

  @Patch('expedientes/:id') @Roles(...ESCRIBEN)
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarExpedienteDto, @CurrentUser() u: UsuarioAutenticado) { return this.svc.actualizar(id, dto, u); }

  @Delete('expedientes/:id') @Roles(Rol.ADMIN, Rol.ARCHIVISTA)
  async desactivar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) {
    await this.svc.desactivar(id, u);
    return { ok: true };
  }

  // ----- documentos -----
  @Get('expedientes/:id/documentos') documentos(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.documentos(id, u); }

  @Post('expedientes/:id/documentos') @Roles(...ESCRIBEN)
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 50 * 1024 * 1024 } }))
  agregarDocumento(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CrearDocumentoDto, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() u: UsuarioAutenticado) {
    return this.svc.agregarDocumento(id, dto, file, u);
  }

  @Delete('expedientes/:id/documentos/ultimo') @Roles(...ESCRIBEN)
  async eliminarUltimo(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) {
    await this.svc.eliminarUltimoDocumento(id, u);
    return { ok: true };
  }

  @Get('documentos/:id/archivo')
  async archivo(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) {
    const { buffer, nombre } = await this.svc.leerArchivo(id, u);
    return new StreamableFile(buffer, { type: 'application/pdf', disposition: `inline; filename*=UTF-8''${encodeURIComponent(nombre)}` });
  }

  @Get('documentos/:id/verificar') verificar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.verificarIntegridad(id, u); }

  // ----- foliación -----
  @Get('expedientes/:id/validar-foliacion') validar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.validarFoliacion(id, u); }
  @Post('expedientes/:id/foliar') @Roles(Rol.ARCHIVISTA) foliar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.foliar(id, u); }
  @Post('expedientes/:id/refoliar') @Roles(Rol.ARCHIVISTA) refoliar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.refoliar(id, u); }
  @Post('expedientes/:id/reabrir-foliacion') @Roles(Rol.ARCHIVISTA) reabrir(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return this.svc.reabrirFoliacion(id, u); }
}
