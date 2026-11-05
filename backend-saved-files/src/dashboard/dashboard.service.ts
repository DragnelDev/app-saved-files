import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { Rol } from '../common/enums/rol.enum.js';
import { DisposicionService } from '../disposicion/disposicion.service.js';
import { PrestamosService } from '../prestamos/prestamos.service.js';
import { UbicacionesService } from '../ubicaciones/ubicaciones.service.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly ubicaciones: UbicacionesService,
    private readonly prestamos: PrestamosService,
    private readonly disposicion: DisposicionService,
  ) {}

  async obtener(u: UsuarioAutenticado) {
    await this.prestamos.actualizarMora();
    if (u.rol === Rol.RESPONSABLE_UNIDAD) return this.unidad(u);
    if (u.rol === Rol.CONSULTOR) return this.consultor();
    return this.archivo();
  }

  private async archivo() {
    const [ocupacion, pendientes, vencidos, alertas, foliados] = await Promise.all([
      this.ubicaciones.ocupacion(),
      this.ds.query(`
        SELECT t.id, t.codigo, t.estado, t.fecha_envio AS "fechaEnvio", u.nombre AS unidad,
               (SELECT COUNT(*) FROM detalle_transferencia d WHERE d.transferencia_id = t.id AND d.activo) AS expedientes
        FROM transferencias t JOIN unidades u ON u.id = t.unidad_origen_id
        WHERE t.activo AND t.estado IN ('ENVIADO','EN_REVISION') ORDER BY t.fecha_envio`),
      this.ds.query(`
        SELECT p.id, p.codigo, p.solicitante_nombre AS solicitante, p.fecha_devolucion_prevista AS "fechaDevolucionPrevista",
               (SELECT string_agg(e.codigo, ', ') FROM detalle_prestamo d JOIN expedientes e ON e.id = d.expediente_id
                 WHERE d.prestamo_id = p.id AND d.activo AND d.fecha_devolucion_real IS NULL) AS expediente,
               (CURRENT_DATE - p.fecha_devolucion_prevista) AS "diasMora"
        FROM prestamos_documentales p
        WHERE p.activo AND p.estado = 'EN_MORA' ORDER BY p.fecha_devolucion_prevista`),
      this.disposicion.vencidos(undefined, 20),
      this.ds.query(`
        SELECT id, codigo, asunto, foja_fin AS "fojaFin", fecha_actualizacion AS "fecha"
        FROM expedientes WHERE activo AND estado_foliacion = 'FOLIADO' ORDER BY fecha_actualizacion DESC LIMIT 10`),
    ]);
    return { tipo: 'ARCHIVO', ocupacion, transferenciasPendientes: pendientes, prestamosVencidos: vencidos, alertasDisposicion: alertas, recienFoliados: foliados };
  }

  private async unidad(u: UsuarioAutenticado) {
    const [exp, borradores, prestamos] = await Promise.all([
      this.ds.query(`SELECT estado, COUNT(*)::int AS n FROM expedientes WHERE activo AND unidad_productora_id = $1 GROUP BY estado`, [u.unidadId]),
      this.ds.query(`SELECT id, codigo, observaciones FROM transferencias WHERE activo AND estado = 'BORRADOR' AND unidad_origen_id = $1 ORDER BY fecha_creacion DESC`, [u.unidadId]),
      this.ds.query(`SELECT estado, COUNT(*)::int AS n FROM prestamos_documentales WHERE activo AND unidad_solicitante_id = $1 GROUP BY estado`, [u.unidadId]),
    ]);
    return { tipo: 'UNIDAD', misExpedientes: exp, transferenciasBorrador: borradores, prestamos };
  }

  private async consultor() {
    const porEstado = await this.ds.query(`SELECT estado, COUNT(*)::int AS n FROM expedientes WHERE activo AND sensibilidad = 'PUBLICO' GROUP BY estado`);
    return { tipo: 'CONSULTOR', expedientesPublicos: porEstado };
  }
}
