import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get() obtener(@CurrentUser() u: UsuarioAutenticado) { return this.svc.obtener(u); }
}
