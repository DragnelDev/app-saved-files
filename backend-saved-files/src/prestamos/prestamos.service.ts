import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../common/decorators/current-user.decorator.js';
import { EstadoExpediente, EstadoPrestamo as EP, TipoSolicitante } from '../common/enums/archivo.enums.js';
import { Rol } from '../common/enums/rol.enum.js';
import { actualizar } from '../common/util/actualizar.js';
import { DbSetupService } from '../database/db-setup.service.js';
import { Expediente } from '../expedientes/expediente.entity.js';
import { DevolverPrestamoDto, EntregarPrestamoDto, SolicitarPrestamoDto } from './prestamos.dto.js';
import { DetallePrestamo, Prestamo } from './prestamos.entity.js';

const ABIERTOS = [EP.SOLICITADO, EP.PRESTADO, EP.EN_MORA];
const sumarDias = (d: number) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

@Injectable()
export class PrestamosService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Prestamo) private readonly repo: Repository<Prestamo>,
    @InjectRepository(DetallePrestamo) private readonly detalles: Repository<DetallePrestamo>,
    @InjectRepository(Expediente) private readonly expedientes: Repository<Expediente>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly db: DbSetupService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.actualizarMora().catch(() => undefined), 30 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() { clearInterval(this.timer); }

  /** Marca EN_MORA las actas vencidas. Se ejecuta periódicamente y antes de cada consulta. */
  async actualizarMora(): Promise<number> {
    return actualizar(
      this.repo.manager,
      Prestamo,
      { estado: EP.PRESTADO, activo: true, fechaDevolucionPrevista: LessThan(sumarDias(0)) },
      { estado: EP.EN_MORA },
    );
  }

  private exigirAcceso(p: Prestamo, u: UsuarioAutenticado) {
    if (u.rol === Rol.RESPONSABLE_UNIDAD && p.unidadSolicitanteId !== u.unidadId) throw new ForbiddenException('No tienes acceso a este préstamo');
  }

  async listar(u: UsuarioAutenticado, estado?: EP) {
    await this.actualizarMora();
    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.unidadSolicitante', 'un')
      .leftJoinAndSelect('p.detalles', 'd', 'd.activo = true')
      .leftJoinAndSelect('d.expediente', 'e')
      .where('p.activo = true')
      .orderBy('p.fechaCreacion', 'DESC');
    if (u.rol === Rol.RESPONSABLE_UNIDAD) qb.andWhere('p.unidadSolicitanteId = :uu', { uu: u.unidadId });
    if (estado) qb.andWhere('p.estado = :estado', { estado });
    return qb.getMany();
  }

  async obtener(id: string, u: UsuarioAutenticado): Promise<Prestamo> {
    await this.actualizarMora();
    const p = await this.repo.findOne({ where: { id, activo: true }, relations: { unidadSolicitante: true, detalles: { expediente: true } } });
    if (!p) throw new NotFoundException('Préstamo no encontrado');
    this.exigirAcceso(p, u);
    p.detalles = (p.detalles ?? []).filter((d) => d.activo);
    return p;
  }

  async solicitar(dto: SolicitarPrestamoDto, u: UsuarioAutenticado): Promise<Prestamo> {
    const lista = await this.expedientes.findBy({ id: In(dto.expedienteIds), activo: true });
    if (lista.length !== dto.expedienteIds.length) throw new NotFoundException('Algún expediente no existe');
    let unidadId: string | null = dto.unidadSolicitanteId ?? null;
    let nombre = dto.solicitanteNombre;
    if (u.rol === Rol.RESPONSABLE_UNIDAD) {
      if (dto.tipoSolicitante !== TipoSolicitante.UNIDAD) throw new ForbiddenException('Un responsable de unidad solo solicita para su unidad');
      if (lista.some((e) => e.unidadProductoraId !== u.unidadId)) throw new ForbiddenException('Solo puedes solicitar expedientes de tu unidad');
      unidadId = u.unidadId;
      nombre ??= u.username;
    }
    if (dto.tipoSolicitante === TipoSolicitante.UNIDAD && !unidadId) throw new BadRequestException('Indica la unidad solicitante');
    if (dto.tipoSolicitante === TipoSolicitante.AUDITOR && !nombre) throw new BadRequestException('Indica el nombre del auditor');
    if (dto.tipoSolicitante === TipoSolicitante.AUDITOR) unidadId = null;
    for (const e of lista) {
      if (e.estado !== EstadoExpediente.EN_ARCHIVO_CENTRAL) throw new ConflictException(`El expediente ${e.codigo} no está disponible en el Archivo Central`);
    }
    const ocupados = await this.detalles
      .createQueryBuilder('d')
      .innerJoin('d.prestamo', 'p')
      .innerJoinAndSelect('d.expediente', 'e')
      .where('d.activo = true AND p.activo = true AND p.estado IN (:...abiertos) AND d.fechaDevolucionReal IS NULL AND d.expedienteId IN (:...ids)', { abiertos: ABIERTOS, ids: dto.expedienteIds })
      .getMany();
    if (ocupados.length) throw new ConflictException(`Ya tienen un préstamo en curso: ${ocupados.map((d) => d.expediente?.codigo).join(', ')}`);

    const n = await this.db.siguiente('seq_prestamo');
    const id = await this.ds.transaction(async (m) => {
      const p = await m.save(
        m.create(Prestamo, {
          codigo: `PR-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`,
          tipoSolicitante: dto.tipoSolicitante,
          unidadSolicitanteId: unidadId,
          solicitanteNombre: nombre ?? '',
          motivo: dto.motivo,
        }),
      );
      for (const expedienteId of dto.expedienteIds) await m.save(m.create(DetallePrestamo, { prestamoId: p.id, expedienteId }));
      return p.id;
    });
    return this.obtener(id, u);
  }

  async entregar(id: string, dto: EntregarPrestamoDto, u: UsuarioAutenticado): Promise<Prestamo> {
    const p = await this.obtener(id, u);
    if (p.estado !== EP.SOLICITADO) throw new ConflictException('El préstamo no está en estado SOLICITADO');
    const det = p.detalles ?? [];
    for (const d of det) {
      if (d.expediente?.estado !== EstadoExpediente.EN_ARCHIVO_CENTRAL) throw new ConflictException(`El expediente ${d.expediente?.codigo} no está disponible en el Archivo Central`);
    }
    const dias = dto.diasPrestamo ?? 15;
    await this.ds.transaction(async (m) => {
      await actualizar(m, Prestamo, id, {
        estado: EP.PRESTADO,
        fechaPrestamo: sumarDias(0),
        fechaDevolucionPrevista: sumarDias(dias),
        observacionesEntrega: dto.observaciones ?? null,
        autorizadoPorId: u.id,
      });
      for (const d of det) {
        await actualizar(m, DetallePrestamo, d.id, { fojasEntregadas: d.expediente?.fojaFin ?? 0 });
        await actualizar(m, Expediente, d.expedienteId, { estado: EstadoExpediente.PRESTADO });
      }
    });
    return this.obtener(id, u);
  }

  async rechazar(id: string, motivo: string, u: UsuarioAutenticado): Promise<void> {
    const p = await this.obtener(id, u);
    if (p.estado !== EP.SOLICITADO) throw new ConflictException('Solo se rechazan solicitudes pendientes');
    await actualizar(this.repo.manager, Prestamo, id, { activo: false, observacionesEntrega: `RECHAZADO: ${motivo}` });
  }

  /** Devuelve todos los expedientes pendientes o solo los indicados (devolución parcial). */
  async devolver(id: string, dto: DevolverPrestamoDto, u: UsuarioAutenticado): Promise<Prestamo> {
    const p = await this.obtener(id, u);
    if (p.estado !== EP.PRESTADO && p.estado !== EP.EN_MORA) throw new ConflictException('El préstamo no está vigente');
    const pendientes = (p.detalles ?? []).filter((d) => !d.fechaDevolucionReal);
    const objetivo = dto.detalleIds ? pendientes.filter((d) => dto.detalleIds!.includes(d.id)) : pendientes;
    if (dto.detalleIds && objetivo.length !== dto.detalleIds.length) throw new BadRequestException('Algún expediente indicado no está pendiente de devolución');
    if (!objetivo.length) throw new BadRequestException('No hay expedientes pendientes de devolución');
    const hoy = sumarDias(0);
    await this.ds.transaction(async (m) => {
      for (const d of objetivo) {
        await actualizar(m, DetallePrestamo, d.id, { fechaDevolucionReal: hoy, observacionDevolucion: dto.observaciones ?? null });
        await actualizar(m, Expediente, d.expedienteId, { estado: EstadoExpediente.EN_ARCHIVO_CENTRAL });
      }
      if (objetivo.length === pendientes.length) {
        await actualizar(m, Prestamo, id, { estado: EP.DEVUELTO, fechaDevolucionReal: hoy, observacionesDevolucion: dto.observaciones ?? null });
      }
    });
    return this.obtener(id, u);
  }
}
