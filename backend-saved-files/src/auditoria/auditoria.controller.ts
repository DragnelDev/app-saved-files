import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsOptional, IsString } from 'class-validator';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginacionDto, paginado } from '../common/dto/paginacion.dto.js';
import { Rol } from '../common/enums/rol.enum.js';
import { Bitacora } from './bitacora.entity.js';

class FiltroBitacoraDto extends PaginacionDto {
  @IsOptional() @IsString() tabla?: string;
  @IsOptional() @IsString() registroId?: string;
}

@Controller('auditoria')
@Roles(Rol.ADMIN, Rol.CONSULTOR)
export class AuditoriaController {
  constructor(@InjectRepository(Bitacora) private readonly repo: Repository<Bitacora>) {}

  @Get()
  async listar(@Query() f: FiltroBitacoraDto) {
    const where: Record<string, string> = {};
    if (f.tabla) where.tabla = f.tabla;
    if (f.registroId) where.registroId = f.registroId;
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (f.page - 1) * f.limit,
      take: f.limit,
    });
    return paginado(items, total, f);
  }
}
