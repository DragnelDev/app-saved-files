import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadesController } from './unidades.controller.js';
import { Unidad } from './unidad.entity.js';

@Module({ imports: [TypeOrmModule.forFeature([Unidad])], controllers: [UnidadesController] })
export class UnidadesModule {}
