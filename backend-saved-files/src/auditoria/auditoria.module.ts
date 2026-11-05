import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaController } from './auditoria.controller.js';
import { Bitacora } from './bitacora.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Bitacora])],
  controllers: [AuditoriaController],
})
export class AuditoriaModule {}
