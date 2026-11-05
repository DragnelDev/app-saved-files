import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { ActualizarUsuarioDto, CambiarPasswordDto, CrearUsuarioDto } from './usuarios.dto.js';
import { UsuariosService } from './usuarios.service.js';

@Controller('usuarios')
@Roles(Rol.ADMIN)
export class UsuariosController {
  constructor(private readonly svc: UsuariosService) {}

  @Get() listar() { return this.svc.listar(); }
  @Post() crear(@Body() dto: CrearUsuarioDto) { return this.svc.crear(dto); }
  @Patch(':id') actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarUsuarioDto) { return this.svc.actualizar(id, dto); }

  @Patch(':id/password')
  async password(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CambiarPasswordDto) {
    await this.svc.cambiarPassword(id, dto.password);
    return { ok: true };
  }

  @Delete(':id')
  async desactivar(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: UsuarioAutenticado) {
    await this.svc.desactivar(id, u.id);
    return { ok: true };
  }
}
