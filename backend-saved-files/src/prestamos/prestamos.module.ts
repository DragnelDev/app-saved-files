import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expediente } from '../expedientes/expediente.entity.js';
import { PrestamosController } from './prestamos.controller.js';
import { DetallePrestamo, Prestamo } from './prestamos.entity.js';
import { PrestamosService } from './prestamos.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Prestamo, DetallePrestamo, Expediente])],
  controllers: [PrestamosController],
  providers: [PrestamosService],
  exports: [PrestamosService],
})
export class PrestamosModule {}
