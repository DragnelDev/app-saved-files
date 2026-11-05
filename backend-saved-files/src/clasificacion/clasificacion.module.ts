import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expediente } from '../expedientes/expediente.entity.js';
import { ClasificacionController } from './clasificacion.controller.js';
import { ActaValoracion, NodoClasificacion, TablaRetencion } from './clasificacion.entities.js';
import { ClasificacionService } from './clasificacion.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([NodoClasificacion, TablaRetencion, ActaValoracion, Expediente])],
  controllers: [ClasificacionController],
  providers: [ClasificacionService],
})
export class ClasificacionModule {}
