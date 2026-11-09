import { Body, Controller, Get, HttpCode, Ip, Post } from '@nestjs/common';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { PermitirPasswordPendiente } from '../common/decorators/permitir-password-pendiente.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { CambiarPasswordPropiaDto, LoginDto } from './dto/login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.auth.login(dto, ip);
  }

  @Get('me')
  @PermitirPasswordPendiente()
  me(@CurrentUser() user: UsuarioAutenticado) {
    return user;
  }

  @Post('cambiar-password')
  @HttpCode(200)
  @PermitirPasswordPendiente()
  async cambiarPassword(@Body() dto: CambiarPasswordPropiaDto, @CurrentUser() user: UsuarioAutenticado, @Ip() ip: string) {
    await this.auth.cambiarPassword(user.id, dto.actual, dto.nueva, ip);
    return { ok: true };
  }
}
