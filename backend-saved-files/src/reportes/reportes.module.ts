import { Module } from '@nestjs/common';
import { DisposicionModule } from '../disposicion/disposicion.module.js';
import { ExpedientesModule } from '../expedientes/expedientes.module.js';
import { PrestamosModule } from '../prestamos/prestamos.module.js';
import { TransferenciasModule } from '../transferencias/transferencias.module.js';
import { UbicacionesModule } from '../ubicaciones/ubicaciones.module.js';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';

@Module({
  imports: [DisposicionModule, ExpedientesModule, UbicacionesModule, PrestamosModule, TransferenciasModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
