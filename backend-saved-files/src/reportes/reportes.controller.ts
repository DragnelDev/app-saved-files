import { Controller, Get, Param, ParseUUIDPipe, StreamableFile } from '@nestjs/common';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { ReportesService } from './reportes.service.js';

const pdf = (b: Buffer, nombre: string) => new StreamableFile(b, { type: 'application/pdf', disposition: `inline; filename="${nombre}.pdf"` });

@Controller('reportes')
export class ReportesController {
  constructor(private readonly svc: ReportesService) {}

  @Get('expedientes/:id/caratula')
  async caratula(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return pdf(await this.svc.caratula(id, u), 'caratula'); }

  @Get('cajas/:id/etiqueta') @Roles(Rol.ARCHIVISTA)
  async etiqueta(@Param('id', ParseUUIDPipe) id: string) { return pdf(await this.svc.etiquetaCaja(id), 'etiqueta-caja'); }

  @Get('prestamos/:id/acta')
  async acta(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return pdf(await this.svc.actaPrestamo(id, u), 'acta-prestamo'); }

  @Get('transferencias/:id/inventario')
  async inventario(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) { return pdf(await this.svc.inventarioTransferencia(id, u), 'inventario-transferencia'); }

  @Get('disposicion/:id/acta') @Roles(Rol.ARCHIVISTA, Rol.CONSULTOR)
  async disposicion(@Param('id', ParseUUIDPipe) id: string) { return pdf(await this.svc.actaDisposicion(id), 'acta-disposicion'); }
}
