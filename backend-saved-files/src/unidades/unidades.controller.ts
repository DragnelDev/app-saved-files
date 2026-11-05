import { Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { ActualizarUnidadDto, CrearUnidadDto } from './unidades.dto.js';
import { Unidad } from './unidad.entity.js';

@Controller('unidades')
export class UnidadesController {
  constructor(@InjectRepository(Unidad) private readonly repo: Repository<Unidad>) {}

  @Get()
  listar() {
    return this.repo.find({ where: { activo: true }, order: { codigo: 'ASC' } });
  }

  @Post()
  @Roles(Rol.ADMIN)
  async crear(@Body() dto: CrearUnidadDto) {
    if (await this.repo.existsBy({ codigo: dto.codigo })) throw new ConflictException('Ya existe una unidad con ese código');
    return this.repo.save(this.repo.create(dto));
  }

  @Patch(':id')
  @Roles(Rol.ADMIN)
  async actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarUnidadDto) {
    const u = await this.repo.findOneBy({ id, activo: true });
    if (!u) throw new NotFoundException('Unidad no encontrada');
    return this.repo.save(Object.assign(u, dto));
  }

  @Delete(':id')
  @Roles(Rol.ADMIN)
  async desactivar(@Param('id', ParseUUIDPipe) id: string) {
    const u = await this.repo.findOneBy({ id, activo: true });
    if (!u) throw new NotFoundException('Unidad no encontrada');
    u.activo = false;
    await this.repo.save(u);
    return { ok: true };
  }
}
