import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NodoClasificacion } from '../clasificacion/clasificacion.entities.js';
import { ExpedientesController } from './expedientes.controller.js';
import { DocumentoExpediente, Expediente } from './expediente.entity.js';
import { ExpedientesService } from './expedientes.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Expediente, DocumentoExpediente, NodoClasificacion])],
  controllers: [ExpedientesController],
  providers: [ExpedientesService],
  exports: [ExpedientesService],
})
export class ExpedientesModule {}
