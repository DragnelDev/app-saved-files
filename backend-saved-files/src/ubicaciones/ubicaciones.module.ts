import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expediente } from '../expedientes/expediente.entity.js';
import { UbicacionesController } from './ubicaciones.controller.js';
import { CajaArchivo, Ubicacion } from './ubicaciones.entities.js';
import { UbicacionesService } from './ubicaciones.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ubicacion, CajaArchivo, Expediente])],
  controllers: [UbicacionesController],
  providers: [UbicacionesService],
  exports: [UbicacionesService],
})
export class UbicacionesModule {}
