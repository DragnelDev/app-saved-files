import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expediente } from '../expedientes/expediente.entity.js';
import { CajaArchivo } from '../ubicaciones/ubicaciones.entities.js';
import { TransferenciasController } from './transferencias.controller.js';
import { DetalleTransferencia, Transferencia } from './transferencias.entities.js';
import { TransferenciasService } from './transferencias.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Transferencia, DetalleTransferencia, Expediente, CajaArchivo])],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
  exports: [TransferenciasService],
})
export class TransferenciasModule {}
