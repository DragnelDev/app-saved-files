import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expediente } from '../expedientes/expediente.entity.js';
import { DisposicionController } from './disposicion.controller.js';
import { DetallePropuesta, PropuestaDisposicion } from './disposicion.entities.js';
import { DisposicionService } from './disposicion.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PropuestaDisposicion, DetallePropuesta, Expediente])],
  controllers: [DisposicionController],
  providers: [DisposicionService],
  exports: [DisposicionService],
})
export class DisposicionModule {}
