import { Module } from '@nestjs/common';
import { DisposicionModule } from '../disposicion/disposicion.module.js';
import { PrestamosModule } from '../prestamos/prestamos.module.js';
import { UbicacionesModule } from '../ubicaciones/ubicaciones.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [UbicacionesModule, PrestamosModule, DisposicionModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
